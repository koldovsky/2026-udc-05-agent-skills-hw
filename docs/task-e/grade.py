#!/usr/bin/env python3
"""Mechanical grader for the Task E portability ladder (rungs P/N/Z).

Reuses Task D's rubric rather than restating it: `pertrial` and the artefact
digests are imported from docs/task-d/grade.py, so a widget built on this ladder
is scored by exactly the checks Task D pre-registered. What this file adds is the
portability question Task D never asked — HOW the skill reached the agent:

    loaded_via_skill_tool  a `Skill` tool_use in the trace (native loader)
    read_skill_md          a Read of .../creating-widget/SKILL.md (prose pointer)
    ran_verify_block       `export NAME=alert` — the SKILL.md `## Verify` fingerprint

    LAB=/tmp/ws05-taske-lab python3 docs/task-e/grade.py probe     # discovery probe
    LAB=/tmp/ws05-taske-lab python3 docs/task-e/grade.py trials    # per-trial behaviour
    LAB=/tmp/ws05-taske-lab python3 docs/task-e/grade.py pertrial  # Task D's 13 checks
    LAB=/tmp/ws05-taske-lab python3 docs/task-e/grade.py trace
"""
import json, os, pathlib, re, sys

LAB = pathlib.Path(os.environ.get("LAB", (os.environ.get("TMPDIR") or "/tmp") + "/ws05-taske-lab"))
os.environ["LAB"] = str(LAB)          # task-d's grader reads LAB at import time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "task-d"))
import grade as d                      # noqa: E402  — Task D's rubric, unmodified

RUNGS = "PNZ"


def calls(tag):
    """[(tool name, input dict)] for one session, in order."""
    f = LAB / f"{tag}.jsonl"
    out, meta, text, failed = [], {}, "", False
    for line in (f.read_text().splitlines() if f.exists() else []):
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        if ev.get("type") == "result":
            meta = {"turns": ev.get("num_turns"), "s": round((ev.get("duration_ms") or 0) / 1000)}
            text, failed = ev.get("result") or "", bool(ev.get("is_error"))
        content = (ev.get("message") or {}).get("content")
        for b in content if isinstance(content, list) else []:
            if b.get("type") == "tool_use":
                out.append((b.get("name", "?"), b.get("input", {})))
    return out, meta, text, failed


def facts(tag):
    c, meta, text, failed = calls(tag)
    blob = " ".join(f"{n} {json.dumps(i)}" for n, i in c)
    skill_calls = [i for n, i in c if n == "Skill"]
    snap, post = LAB / "snap" / tag, LAB / f"post_{tag}.txt"
    return {
        "failed": failed,
        "turns": meta.get("turns"), "s": meta.get("s"),
        # how the skill was reached
        "loaded_via_skill_tool": any("creating-widget" in json.dumps(i) for i in skill_calls),
        "read_skill_md": bool(re.search(r"creating-widget[/\\]SKILL\.md", blob)),
        # what it did with it. `ran_verify_block` is Task D's pre-registered
        # fingerprint, kept identical so the two experiments compare directly.
        # `verify_loose` was added AFTER seeing N_t2 run the same block with an
        # inline `NAME=alert PROPS=… node -e` instead of `export`; it is reported
        # next to the strict count, never instead of it.
        "ran_verify_block": "export NAME=alert" in blob,
        "verify_loose": "NAME=alert" in blob and "dist/bundle.js" in blob,
        "runtime_check": "dist/bundle.js" in blob and "npm run build" in blob,
        "npm_test": "npm test" in blob,
        "wired": ("alert/alert" in (snap / "index.ts").read_text()
                  if (snap / "index.ts").exists() else False),
        "runtime_ok": (d.EXPECT_INFO in post.read_text()) if post.exists() else None,
        "src": d.digest(snap / "alert.ts"), "src_ws": d.digest(snap / "alert.ts", normalise=True),
        "test": d.digest(snap / "alert.test.ts"),
        "test_ws": d.digest(snap / "alert.test.ts", normalise=True),
        "answer_chars": len(text),
        "answer": re.sub(r"\s+", " ", text),
    }


def tags(pattern):
    return sorted(p.stem for p in LAB.glob(pattern))


def fisher(a, b, c, e):
    """Two-sided Fisher exact on [[a,b],[c,e]] — every table with probability
    <= the observed one. Pure stdlib: no scipy on the machine that ran this."""
    from math import comb
    n, r1, c1 = a + b + c + e, a + b, a + c

    def p(x):
        return comb(r1, x) * comb(n - r1, c1 - x) / comb(n, c1)

    lo, hi = max(0, c1 - (n - r1)), min(r1, c1)
    obs = p(a)
    return sum(p(x) for x in range(lo, hi + 1) if p(x) <= obs * (1 + 1e-9))


def mannwhitney(xs, ys):
    """Exact two-sided Mann-Whitney U by enumerating every split of the pooled
    sample. Ties get the usual mid-rank treatment. n=5 vs n=5 is 252 splits."""
    from itertools import combinations
    pooled = sorted(xs + ys)
    n1 = len(xs)

    def U(v):                       # mid-ranks, so ties do not inflate the statistic
        r = sum(pooled.index(x) + 1 + (pooled.count(x) - 1) / 2 for x in v)
        return r - n1 * (n1 + 1) / 2

    obs = U(xs)
    allU = [U([pooled[i] for i in pick]) for pick in combinations(range(len(pooled)), n1)]
    mid = n1 * len(ys) / 2
    return obs, sum(abs(u - mid) >= abs(obs - mid) - 1e-9 for u in allU) / len(allU)


def show_trace(tag):
    c, _, _, _ = calls(tag)
    for n, i in c:
        arg = i.get("file_path") or i.get("command") or i.get("pattern") or i.get("path") \
            or i.get("skill") or i.get("description") or ""
        arg = re.sub(r"\s+", " ", str(arg))
        arg = re.sub(r"\S*/run[PNZ]/", "", arg)      # lab prefix, however TMPDIR resolved
        print(f"  {n:9} {arg[:150]}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "trials"

    if mode == "probe":
        # The loader question, asked directly: with no file access, does the tool
        # already know the skill exists? Scored from the trace, plus the answer
        # text quoted verbatim so a reader can see what the session claimed.
        for r in RUNGS:
            t = f"probe{r}"
            if not (LAB / f"{t}.jsonl").exists():
                continue
            v = facts(t)
            print(f"===== {t}  turns={v['turns']} s={v['s']}"
                  + ("  API ERROR — excluded" if v["failed"] else ""))
            print(f"  Skill tool call for creating-widget : {v['loaded_via_skill_tool']}")
            print(f"  read SKILL.md instead               : {v['read_skill_md']}")
            print(f"  tool calls                          : "
                  f"{[n for n, _ in calls(t)[0]] or 'none'}")
            print(f"  answer: {v['answer'][:600]}")

    elif mode == "stats":
        rows = {t: facts(t) for t in tags("run?_t?.jsonl")}
        rows = {t: v for t, v in rows.items() if not v["failed"]}
        by = {r: [v for t, v in rows.items() if t[3] == r] for r in RUNGS}
        print("Fisher exact, two-sided, on pre-specified behaviour rows:")
        for col in ("verify_loose", "ran_verify_block", "runtime_check"):
            for x, y in (("N", "Z"), ("P", "Z"), ("N", "P")):
                a = sum(v[col] for v in by[x]); b = len(by[x]) - a
                c = sum(v[col] for v in by[y]); e = len(by[y]) - c
                print(f"  {col:17} {x} {a}/{a+b} vs {y} {c}/{c+e}   p = {fisher(a, b, c, e):.4f}")
        print("\nMann-Whitney U, exact, two-sided — cost of the two discovery paths:")
        for col in ("turns", "s"):
            xs = [v[col] for v in by["N"]]
            ys = [v[col] for v in by["P"]]
            u, p = mannwhitney(xs, ys)
            print(f"  {col:6} N {sorted(xs)} vs P {sorted(ys)}   U = {u:.1f}, p = {p:.4f}")

    elif mode == "trace":
        for t in tags("run?_t?.jsonl") + tags("probe?.jsonl"):
            print(f"===== {t}")
            show_trace(t)

    elif mode == "pertrial":
        for t in tags("run?_t?.jsonl"):
            if facts(t)["failed"]:
                print(f"{t.replace('run', ''):8} API ERROR — excluded")
                continue
            res = d.pertrial(t)          # Task D's 13 checks, unchanged
            bad = [k for k, v in res.items() if not v]
            print(f"{t.replace('run', ''):8} {sum(res.values())}/{len(res)}"
                  + (f"  FAIL: {'; '.join(bad)}" if bad else ""))

    else:
        allrows = {t: facts(t) for t in tags("run?_t?.jsonl")}
        dead = [t for t, v in allrows.items() if v["failed"]]
        rows = {t: v for t, v in allrows.items() if not v["failed"]}
        if dead:
            print(f"excluded {len(dead)} session(s) that died on an API error: "
                  f"{', '.join(t.replace('run', '') for t in dead)}\n")
        cols = ["turns", "s", "loaded_via_skill_tool", "read_skill_md", "ran_verify_block",
                "verify_loose", "runtime_check", "wired", "runtime_ok", "src", "src_ws", "test_ws"]
        print(f"{'trial':8}" + "".join(f"{c[:13]:>15}" for c in cols))
        for t, v in rows.items():
            print(f"{t.replace('run',''):8}" + "".join(f"{str(v[c]):>15}" for c in cols))
        for rung in RUNGS:
            sel = [v for t, v in rows.items() if t[3] == rung]
            if not sel:
                continue
            n = len(sel)
            print(f"rung {rung} n={n}: reached-the-skill "
                  f"{sum(v['loaded_via_skill_tool'] or v['read_skill_md'] for v in sel)}/{n} "
                  f"(Skill tool {sum(v['loaded_via_skill_tool'] for v in sel)}, "
                  f"Read {sum(v['read_skill_md'] for v in sel)}), "
                  f"verify-block {sum(v['ran_verify_block'] for v in sel)}/{n} strict "
                  f"({sum(v['verify_loose'] for v in sel)}/{n} loose), "
                  f"runtime-check {sum(v['runtime_check'] for v in sel)}/{n}, "
                  f"distinct alert.ts {len({v['src'] for v in sel})} raw / "
                  f"{len({v['src_ws'] for v in sel})} ws-normalised, "
                  f"median turns {sorted(v['turns'] for v in sel)[n // 2]}, "
                  f"median s {sorted(v['s'] for v in sel)[n // 2]}")
        allv = list(rows.values())
        if allv:
            print(f"\nall {len(allv)} sessions: distinct alert.ts {len({v['src'] for v in allv})} raw / "
                  f"{len({v['src_ws'] for v in allv})} ws-normalised")

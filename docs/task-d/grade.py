#!/usr/bin/env python3
"""Mechanical grader for the Task D ablation ladder.

The 15-check rubric was fixed BEFORE any run. Every check is a file, grep,
exit code or stream-json trace fact — nothing is scored from the agent's own
account of what it did (see docs/task-a-verification.md, run 2, for why).

    LAB=/tmp/ws05-taskd-lab python3 docs/task-d/grade.py rubric   # per-rung, 15 checks
    LAB=/tmp/ws05-taskd-lab python3 docs/task-d/grade.py trials   # per-trial behaviour

Artefact identity is reported twice per trial: `src`/`test` are sha256 prefixes
of the raw bytes, `src_ws`/`test_ws` of the same file with whitespace collapsed.
Only the second one may be called "identical modulo formatting" — the numbers in
ab-validation.md say which of the two they mean.
"""
import hashlib, json, os, pathlib, re, subprocess, sys

LAB = pathlib.Path(os.environ.get("LAB", (os.environ.get("TMPDIR") or "/tmp") + "/ws05-taskd-lab"))
EXPECT_INFO = '<div class="alert alert--info">Saved</div>'
EXPECT_WARN = '<div class="alert alert--warn">Saved</div>'


def sh(cmd, cwd, timeout=300):
    """Run cmd and return (exit code, combined output).

    bash + pipefail, deliberately: every command here ends in `| tail -N`, and
    under /bin/sh the exit code would be tail's, i.e. always 0. Checks 12 and 13
    are scored off this code — they were silently vacuous until that was fixed.
    """
    p = subprocess.run(f"set -o pipefail; {cmd}", cwd=cwd, shell=True, executable="/bin/bash",
                       capture_output=True, text=True, timeout=timeout)
    return p.returncode, (p.stdout + p.stderr).strip()


def static_checks(src, tsrc, idx, ts_exists, test_exists):
    """Checks 1-10: everything decidable from the three files the agent wrote.
    Shared by rubric() (rung tree) and pertrial() (per-trial snapshot)."""
    # Every relative specifier the agent could have written: `from "…"` in the two
    # widget files, plus the side-effect `import "./alert/alert.js";` it adds to
    # widgets/index.ts — that form has no `from`, so collecting only the first
    # pattern let a missing .js in the wiring line through while check 4 passed.
    rel = re.findall(r'from "(\.[^"]+)"', src + tsrc) \
        + re.findall(r'^\s*import\s+"(\.[^"]+)"\s*;?', idx, re.M)
    res = {}
    res["1 file at widgets/alert/alert.ts"] = ts_exists
    res["2 colocated alert.test.ts"] = test_exists
    res["3 top-level register(\"alert\", ...)"] = bool(re.search(r'^register\("alert"', src, re.M))
    res["4 wired into widgets/index.ts"] = "alert/alert" in idx
    res["5 .js on every relative import"] = bool(rel) and all(x.endswith(".js") for x in rel)
    res["6 named export, no default"] = "export function createAlert" in src and "export default" not in src
    res["7 no any"] = not re.search(r"\bany\b", re.sub(r"//.*", "", src))
    res["8 AlertProps extends WidgetProps"] = "extends WidgetProps" in src
    res["9 tone union + default info"] = bool(re.search(r'"info"\s*\|\s*"warn"\s*\|\s*"error"', src)) \
        and bool(re.search(r'\?\?\s*"info"', src))
    res["10 exact markup"] = bool(re.search(r'<div class="alert alert--\$\{tone\}">\$\{[^}]*message\}</div>', src))
    return res


def rubric(r):
    """The 15 pre-registered checks, run against a rung's post-run tree.

    A rung's tree holds the LAST trial run on it (one_run resets the rung before
    each trial), so this is a per-rung snapshot, not a per-trial one. Use
    `pertrial` for the 13 checks that survive per trial.
    """
    root, app = LAB / f"run{r}", LAB / f"run{r}" / "app"
    w = app / "src" / "widgets"
    ts, test = w / "alert" / "alert.ts", w / "alert" / "alert.test.ts"
    src = ts.read_text() if ts.exists() else ""
    tsrc = test.read_text() if test.exists() else ""
    idx = (w / "index.ts").read_text() if (w / "index.ts").exists() else ""
    ev = {}
    res = static_checks(src, tsrc, idx, ts.exists(), test.exists())
    if not ts.exists():
        ev["actual location"] = ", ".join(str(p.relative_to(root)) for p in app.rglob("*alert*")) or "none"

    _, out = sh("git diff --name-only HEAD", root)
    ev["tracked files touched"] = ", ".join(out.split()) or "none"
    res["11 core/registry.ts untouched"] = "app/src/core/registry.ts" not in out

    # 12 and 13 assert on the output as well as the exit code, so neither can go
    # vacuous again if the shell ever stops honouring pipefail.
    code, out = sh("npm test 2>&1 | tail -6", app)
    ev["npm test"] = out.replace("\n", " | ")
    res["12 npm test green"] = (code == 0 and "failed" not in out.lower()
                                and bool(re.search(r"Tests\s+\d+ passed", out)))

    code, out = sh("npm run typecheck 2>&1 | tail -4", app)
    ev["typecheck"] = out.replace("\n", " | ") or "(no output)"
    res["13 typecheck clean"] = code == 0 and "error TS" not in out

    _, out = sh("npm run build >/dev/null 2>&1 && node -e \"import('./dist/bundle.js').then(m=>"
                "{console.log(JSON.stringify(m.listWidgets()));"
                "['info','warn'].forEach(t=>{try{console.log(m.create('alert',"
                "t==='info'?{message:'Saved'}:{message:'Saved',tone:t}))}"
                "catch(e){console.log('THROWS: '+e.message)}})})\"", app)
    ev["runtime"] = out.replace("\n", " | ")
    res["14 runtime create() exact HTML"] = EXPECT_INFO in out and EXPECT_WARN in out
    res["15 listWidgets() contains alert"] = any(
        l.startswith("[") and '"alert"' in l for l in out.splitlines())
    return res, ev


def pertrial(tag):
    """The 13 checks that survive per trial, from that trial's snapshot + post
    capture. 11 (registry untouched) and 13 (typecheck) are rung-level only —
    they need the full tree, which the next trial's reset overwrites.
    """
    snap, post = LAB / "snap" / tag, LAB / f"post_{tag}.txt"
    ts, test, idx = snap / "alert.ts", snap / "alert.test.ts", snap / "index.ts"
    res = static_checks(ts.read_text() if ts.exists() else "",
                        test.read_text() if test.exists() else "",
                        idx.read_text() if idx.exists() else "",
                        ts.exists(), test.exists())
    out = post.read_text() if post.exists() else ""
    res["12 npm test green"] = bool(re.search(r"Tests\s+\d+ passed", out)) and "failed" not in out.lower()
    res["14 runtime create() exact HTML"] = EXPECT_INFO in out
    res["15 listWidgets() contains alert"] = any(
        l.startswith("[") and '"alert"' in l for l in out.splitlines())
    return res


def digest(p, normalise=False):
    """sha256 prefix of a file. normalise=True collapses whitespace first, so
    two files that differ only in line wrapping hash the same."""
    if not p.exists():
        return "MISSING"
    raw = p.read_text()
    if normalise:
        raw = re.sub(r"\s+", " ", raw).strip()
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def trial_facts(tag):
    """Behavioural facts for one trial, read from its stream-json trace."""
    f = LAB / f"{tag}.jsonl"
    calls, meta, text, failed = [], {}, "", False
    for line in (f.read_text().splitlines() if f.exists() else []):
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        if ev.get("type") == "result":
            meta = {"turns": ev.get("num_turns"), "s": round((ev.get("duration_ms") or 0) / 1000)}
            text = ev.get("result") or ""
            failed = bool(ev.get("is_error"))
        content = (ev.get("message") or {}).get("content")
        for b in content if isinstance(content, list) else []:
            if b.get("type") == "tool_use":
                calls.append(json.dumps(b.get("input", {})))
    blob = " ".join(calls)
    snap = LAB / "snap" / tag
    post = LAB / f"post_{tag}.txt"
    return {
        "failed": failed,
        "turns": meta.get("turns"), "s": meta.get("s"),
        "opened_skill": "creating-widget/SKILL.md" in blob,
        "ran_verify_block": "export NAME=alert" in blob,      # fingerprint of SKILL.md ## Verify
        "other_skill": bool(re.search(r"(architecture-deep-dive|analyzing-bundle-size)", blob)),
        "npm_test": "npm test" in blob,
        "typecheck": "typecheck" in blob,
        "runtime_check": "dist/bundle.js" in blob and "npm run build" in blob,
        "src": digest(snap / "alert.ts"), "test": digest(snap / "alert.test.ts"),
        "src_ws": digest(snap / "alert.ts", normalise=True),
        "test_ws": digest(snap / "alert.test.ts", normalise=True),
        "wired": "alert/alert" in (snap / "index.ts").read_text() if (snap / "index.ts").exists() else False,
        "runtime_ok": EXPECT_INFO in post.read_text() if post.exists() else None,
        "answer_chars": len(text),
    }


def trace(tag):
    """The tool-call sequence of one trial — the evidence behind every
    behavioural claim in ab-validation.md, in the order it happened."""
    out = []
    for line in (LAB / f"{tag}.jsonl").read_text().splitlines():
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        content = (ev.get("message") or {}).get("content")
        for b in content if isinstance(content, list) else []:
            if b.get("type") != "tool_use":
                continue
            i = b.get("input", {})
            arg = i.get("file_path") or i.get("command") or i.get("pattern") or i.get("path") or ""
            arg = re.sub(r"\s+", " ", str(arg))
            arg = arg.replace(f"{LAB}/run{tag[3]}/", "").replace(f"{LAB}/", "")
            out.append(f"  {b.get('name', '?'):9} {arg[:150]}")
    return out


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "rubric"
    if mode == "trace":
        for t in sorted(p.stem for p in LAB.glob("run?_t?.jsonl")):
            print(f"===== {t}"), print("\n".join(trace(t)))
        sys.exit(0)
    if mode == "pertrial":
        tags = sorted(p.stem for p in LAB.glob("run?_t?.jsonl"))
        for t in tags:
            if trial_facts(t)["failed"]:
                print(f"{t.replace('run', ''):8} API ERROR — excluded")
                continue
            res = pertrial(t)
            bad = [k for k, v in res.items() if not v]
            print(f"{t.replace('run', ''):8} {sum(res.values())}/{len(res)}"
                  + (f"  FAIL: {'; '.join(bad)}" if bad else ""))
    elif mode == "rubric":
        for r in "ABCDE":
            res, ev = rubric(r)
            print(f"\n===== run{r}  {sum(res.values())}/{len(res)} =====")
            for k, v in res.items():
                print(f"  {'PASS' if v else 'FAIL'}  {k}")
            for k, v in ev.items():
                print(f"  · {k}: {v}")
    else:
        tags = sorted(p.stem for p in LAB.glob("run?_t?.jsonl"))
        allrows = {t: trial_facts(t) for t in tags}
        dead = [t for t, v in allrows.items() if v["failed"]]
        rows = {t: v for t, v in allrows.items() if not v["failed"]}
        if dead:
            print(f"excluded {len(dead)} session(s) that died on an API error "
                  f"(not data points): {', '.join(t.replace('run', '') for t in dead)}\n")
        cols = ["turns", "s", "opened_skill", "ran_verify_block", "other_skill",
                "runtime_check", "wired", "runtime_ok", "src", "src_ws", "test", "test_ws"]
        print(f"{'trial':10}" + "".join(f"{c[:14]:>16}" for c in cols))
        for t, v in rows.items():
            print(f"{t.replace('run',''):10}" + "".join(f"{str(v[c]):>16}" for c in cols))
        for rung in "ABCDE":
            sel = [v for t, v in rows.items() if t[3] == rung]
            if sel:
                n = len(sel)
                print(f"rung {rung} n={n}: runtime_check {sum(v['runtime_check'] for v in sel)}/{n}, "
                      f"verify-block {sum(v['ran_verify_block'] for v in sel)}/{n}, "
                      f"distinct alert.ts {len({v['src'] for v in sel})} raw / "
                      f"{len({v['src_ws'] for v in sel})} ws-normalised, "
                      f"median turns {sorted(v['turns'] for v in sel)[n // 2]}, "
                      f"median s {sorted(v['s'] for v in sel)[n // 2]}, "
                      f"median answer {sorted(v['answer_chars'] for v in sel)[n // 2]} ch")
        allv = list(rows.values())
        print(f"\nall {len(allv)} sessions: distinct alert.ts "
              f"{len({v['src'] for v in allv})} raw / {len({v['src_ws'] for v in allv})} ws-normalised; "
              f"distinct alert.test.ts {len({v['test'] for v in allv})} raw / "
              f"{len({v['test_ws'] for v in allv})} ws-normalised")

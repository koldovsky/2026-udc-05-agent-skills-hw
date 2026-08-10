#!/usr/bin/env python3
"""Portability linter for Agent Skills — the static half of Task E.

The ladder in portability-harness.sh answers "is this skill discovered by a second
tool's loader". This answers the question the ladder cannot: "would these bytes
still be VALID if they travelled" — to claude.ai, the Skills API, `package_skill.py`,
Cursor, or any other client of the Agent Skills spec.

Rules are the published spec (agentskills.io/specification), not house style:

    name           required · 1-64 chars · [a-z0-9-] · no leading/trailing/double
                   hyphen · MUST match the parent directory name
    description    required · 1-1024 chars · non-empty
    other keys     only license, compatibility (<=500), metadata (map), allowed-tools

Anything outside those six loads fine in Claude Code and fails hard elsewhere:

    Unexpected key(s) in SKILL.md frontmatter: argument-hint.
    Allowed properties are: allowed-tools, compatibility, description, license,
    metadata, name

Frontmatter is parsed the way a receiving tool parses it — PyYAML when installed,
otherwise a strict built-in reader that rejects the same things (duplicate keys,
`: ` inside an unquoted scalar). A lenient hand-rolled parser would hide exactly
the breakage this file is looking for.

FAIL = breaks the spec. WARN = still loads, but costs portability (absolute paths,
Claude Code-only `${CLAUDE_*}` substitutions, dangling relative references,
oversized body). NOTE = a dependency on a file outside the skill directory: legal,
invisible to the linter's judgement, but it does not travel when the folder does.

    python3 docs/task-e/portlint.py                 # every skill in this repo
    python3 docs/task-e/portlint.py path/to/skill   # one skill directory

Exit code: 1 if any FAIL, else 0.
"""
import hashlib, pathlib, re, sys

try:                        # the system python3 does not ship PyYAML; see frontmatter()
    import yaml
except ImportError:
    yaml = None

SPEC_FIELDS = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")     # also rejects -x, x- and x--y
SKILL_ROOTS = [".agents/skills", ".claude/skills"]
# Body patterns that are legal markdown but cost portability.
HAZARDS = [
    (r"(?<![\w.])/(Users|home)/", "absolute POSIX path — breaks on any other machine"),
    (r"[A-Za-z]:\\\\", "absolute Windows path"),
    (r"(?<![\w`])~/", "home-relative path — resolves differently per user"),
    (r"\$\{CLAUDE_[A-Z_]+\}", "Claude Code-only substitution — literal text elsewhere"),
    (r"!`", "Claude Code-only inline shell execution in the body"),
    (r"\.(claude|cursor|codex)/skills", "hard-codes one tool's skills directory"),
]


class FrontmatterError(Exception):
    """Frontmatter a spec-compliant loader would refuse. Claude Code's reader is
    lenient; claude.ai upload, the Skills API and package_skill.py are not, so
    "it loads here" says nothing about whether it travels."""


def _parse_yaml(block):
    """PyYAML in safe mode, with duplicate keys promoted to errors — plain
    `yaml.safe_load` keeps the last one silently, and which one wins is exactly
    the kind of thing that differs between loaders."""
    class NoDuplicates(yaml.SafeLoader):
        pass

    def mapping(loader, node, deep=False):
        seen = set()
        for key_node, _ in node.value:
            key = loader.construct_object(key_node, deep=deep)
            if key in seen:
                raise FrontmatterError(f"duplicate key {key!r}")
            seen.add(key)
        return yaml.SafeLoader.construct_mapping(loader, node, deep)

    NoDuplicates.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
    try:
        data = yaml.load(block, Loader=NoDuplicates)
    except yaml.YAMLError as exc:
        raise FrontmatterError(f"invalid YAML: {str(exc).splitlines()[0]}") from exc
    return data


def _parse_minimal(block):
    """Fallback for a python without PyYAML: top-level `key: value` plus indented
    continuation lines. Deliberately strict — a line it cannot account for is an
    error, not a line to drop, and the two YAML rules a hand-written SKILL.md
    trips over most (duplicate keys, `: ` inside an unquoted value) are checked
    explicitly, because a real loader rejects both."""
    fm, key = {}, None
    for n, line in enumerate(block.splitlines(), 1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line[0].isspace():                       # nested under the previous key
            if key is None:
                raise FrontmatterError(f"line {n}: indented line before any key")
            fm[key] = (fm[key] or "") + " " + line.strip()
            continue
        k, sep, v = line.partition(":")
        if not sep or not k.strip():
            raise FrontmatterError(f"line {n}: not a `key: value` pair: {line.strip()!r}")
        key, v = k.strip(), v.strip()
        if key in fm:
            raise FrontmatterError(f"line {n}: duplicate key {key!r}")
        if v[:1] not in {'"', "'", "|", ">", "[", "{", ""} and ": " in v:
            raise FrontmatterError(
                f"line {n}: key {key!r} — an unquoted YAML scalar may not contain "
                "': '; quote the value or replace the colon")
        fm[key] = v
    return fm


def frontmatter(text):
    """(mapping, body) for the `--- … ---` block, parsed the way a receiving tool
    would: PyYAML when it is installed, otherwise the strict reader above.
    Returns (None, text) when there is no block; raises FrontmatterError when the
    block exists but is not valid."""
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        return None, text
    fm = _parse_yaml(m.group(1)) if yaml else _parse_minimal(m.group(1))
    if fm is None:
        fm = {}
    if not isinstance(fm, dict):
        raise FrontmatterError(f"frontmatter must be a mapping, got {type(fm).__name__}")
    return fm, m.group(2)


def lint(skill_dir):
    """(list of (level, message)) for one skill directory."""
    out, sd = [], pathlib.Path(skill_dir)
    md = sd / "SKILL.md"
    if not md.exists():
        return [("FAIL", f"no SKILL.md in {sd}")]
    try:
        fm, body = frontmatter(md.read_text())
    except FrontmatterError as exc:
        return [("FAIL", f"frontmatter does not parse as YAML: {exc}")]
    if fm is None:
        return [("FAIL", "no YAML frontmatter delimited by --- ... ---")]

    # A loader hands back whatever type the YAML said; the spec's string fields
    # must actually be strings, and the checks below assume it.
    for key in ("name", "description", "license", "compatibility"):
        if key in fm and not isinstance(fm[key], str):
            out.append(("FAIL", f"{key} must be a string, got {type(fm[key]).__name__}"))
            del fm[key]
    if "metadata" in fm and not isinstance(fm["metadata"], dict):
        out.append(("FAIL", f"metadata must be a map, got {type(fm['metadata']).__name__}"))

    name = fm.get("name")
    if not name:
        out.append(("FAIL", "name is required"))
    else:
        if len(name) > 64:
            out.append(("FAIL", f"name is {len(name)} chars, spec max is 64"))
        if not NAME_RE.match(name):
            out.append(("FAIL", f"name {name!r} is not [a-z0-9] with single internal hyphens"))
        if name != sd.name:
            out.append(("FAIL", f"name {name!r} != directory {sd.name!r} — spec requires a match"))

    desc = fm.get("description")
    if not desc:
        out.append(("FAIL", "description is required and must be non-empty"))
    elif len(desc) > 1024:
        out.append(("FAIL", f"description is {len(desc)} chars, spec max is 1024"))
    else:
        # Not a spec rule, but the reason descriptions exist: a description that
        # says only what the skill does gives the loader nothing to match on.
        if not re.search(r"\b(use|when|apply|trigger)\b", desc, re.I):
            out.append(("WARN", "description never says WHEN to use the skill"))
        out.append(("INFO", f"description {len(desc)}/1024 chars"))

    extra = set(fm) - SPEC_FIELDS
    if extra:
        # FAIL, not WARN: these load in Claude Code and are a hard error everywhere
        # else, so a skill carrying them does not travel — which is what this
        # linter is for.
        out.append(("FAIL", f"non-spec frontmatter {sorted(extra)} — loads in Claude Code, "
                            "hard error on claude.ai upload / Skills API / package_skill.py"))
    if "compatibility" in fm and len(fm["compatibility"]) > 500:
        out.append(("FAIL", "compatibility exceeds 500 chars"))

    lines = body.splitlines()
    if len(lines) > 500:
        out.append(("WARN", f"body is {len(lines)} lines; spec recommends keeping SKILL.md "
                            "under 500 and moving detail into references/"))
    out.append(("INFO", f"body {len(lines)} lines, ~{len(body) // 4} tokens"))

    for pat, why in HAZARDS:
        for hit in {m.group(0) for m in re.finditer(pat, body)}:
            out.append(("WARN", f"{why}: {hit!r}"))

    # Relative references the spec says to write as skill-root-relative paths.
    for ref in sorted({m.group(1) for m in
                       re.finditer(r"(?<![\w/.])((?:references|scripts|assets)/[\w./-]+)", body)}):
        lvl = "INFO" if (sd / ref).exists() else "WARN"
        out.append((lvl, f"bundled reference {ref}" + ("" if lvl == "INFO" else " — MISSING on disk")))

    # Paths that point outside the skill folder: they do not travel with it.
    ext = sorted({m.group(0) for m in re.finditer(r"\b(?:app|materials|docs)/[\w./-]+", body)}
                 | ({"app/AGENTS.md"} if "AGENTS.md" in body else set()))
    if ext:
        out.append(("NOTE", f"{len(ext)} path(s) outside the skill dir — the skill assumes this "
                            f"repo's layout: {', '.join(ext[:6])}"
                            + (" …" if len(ext) > 6 else "")))
    return out


def mirrors(repo):
    """Path 1 keeps the same skill in two directories. That is a copy, and copies
    drift — so the copies are hashed, not eyeballed."""
    out, seen = [], {}
    for root in SKILL_ROOTS:
        for sd in sorted((repo / root).glob("*")) if (repo / root).is_dir() else []:
            if sd.is_dir():
                seen.setdefault(sd.name, []).append(sd)
    for name, dirs in seen.items():
        if len(dirs) < 2:
            continue
        sigs = []
        for d in dirs:
            files = sorted(p for p in d.rglob("*") if p.is_file())
            h = hashlib.sha256()
            for p in files:
                h.update(str(p.relative_to(d)).encode())
                h.update(p.read_bytes())
            sigs.append((d, h.hexdigest()[:12], len(files)))
        same = len({s for _, s, _ in sigs}) == 1
        out.append((("INFO" if same else "FAIL"),
                    f"mirror {name}: " + " | ".join(
                        f"{d.relative_to(repo)} {s} ({n} file{'s' if n != 1 else ''})"
                        for d, s, n in sigs)
                    + ("  IDENTICAL" if same else "  DRIFTED — the copies are not the same skill")))
    return out


if __name__ == "__main__":
    repo = pathlib.Path(__file__).resolve().parent.parent.parent
    targets = [pathlib.Path(a) for a in sys.argv[1:]] or [
        sd for root in SKILL_ROOTS
        for sd in sorted((repo / root).glob("*")) if sd.is_dir()]
    fails = 0
    for sd in targets:
        res = lint(sd)
        bad = sum(l == "FAIL" for l, _ in res)
        fails += bad
        print(f"\n=== {sd.relative_to(repo) if sd.is_relative_to(repo) else sd}  "
              f"{'FAIL' if bad else 'OK'}")
        for level, msg in res:
            print(f"  {level:5} {msg}")
    print("\n=== mirrors (path 1 keeps two copies of one skill — they must not drift)")
    for level, msg in mirrors(repo) or [("INFO", "no skill exists in two roots")]:
        fails += level == "FAIL"
        print(f"  {level:5} {msg}")
    print(f"\n{'FAIL' if fails else 'PASS'}: {fails} spec violation(s)")
    sys.exit(1 if fails else 0)

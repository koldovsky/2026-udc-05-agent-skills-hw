#!/usr/bin/env bash
# Task E harness — cross-loader portability test for the `creating-widget` skill.
#
#   bash docs/task-e/portability-harness.sh setup      # build rungs P/N/Z
#   bash docs/task-e/portability-harness.sh probe      # discovery probe, 1 session per rung
#   bash docs/task-e/portability-harness.sh run        # the widget task, 1 trial per rung
#   bash docs/task-e/portability-harness.sh trials 3   # trials 2..n on all three rungs
#
# The question is NOT "does the markdown still read well in another tool" — it is
# whether the SAME BYTES are discovered by a second tool's loader and produce the
# same behaviour. Three rungs, one skill file, one sha256:
#
#   P  .agents/skills/creating-widget/  + every prose pointer intact
#      = the repo as committed. Claude Code does not scan `.agents/`, so the skill
#        is reachable only because AGENTS.md points at it and the agent reads it.
#        (This is Task D rung A, replicated here so both rungs come from one lab.)
#   N  .claude/skills/creating-widget/  + every prose pointer scrubbed
#      = the byte-identical copy, discovered by the native loader alone. No prose
#        anywhere mentions the skill, so anything the agent does with it came from
#        the loader.
#   Z  no creating-widget anywhere + pointers scrubbed
#      = the floor N is measured against.
#
# P and N differ in TWO ways at once (path and pointer) on purpose: each rung is
# one tool's real convention as that tool ships it, not a lab-only hybrid. Z
# isolates the half that matters — N minus Z is what the native loader buys with
# no prose help at all.
#
# Same prompt as Task D (materials/ab-task.md, extracted programmatically), so the
# rungs here are comparable with that experiment's 17 sessions. One deviation:
# `Skill` is in the allowlist on every rung. Rung N cannot express itself without
# it, and P/Z get it too so the allowlist is not a confound.
#
# The working repo is only ever read (rsync source); every session runs in a copy
# under $LAB with its own git repo whose HEAD is that rung's baseline.
set -uo pipefail

SRC="$(git rev-parse --show-toplevel)"
LAB="${LAB:-${TMPDIR:-/tmp}/ws05-taske-lab}"
PROMPT_FILE="$LAB/prompt.txt"
PROBE_FILE="$LAB/probe.txt"
RUNGS=(P N Z)
ALLOWED=(Read Write Edit Glob Grep Bash TodoWrite Skill)

# Removes every mention of the skill from prose, so a rung that still uses it can
# only have found it through a loader. Same edits as Task D's rung C.
scrub_pointers() {
  local d=$1
  rm -rf "$d/docs" "$d/README.md" "$d/.coderabbit.yaml" "$d/.github"
  python3 - "$d" <<'PY'
import pathlib, re, sys
root = pathlib.Path(sys.argv[1])
p = root / "app" / "AGENTS.md"
t = re.sub(r"- `creating-widget`.*?(?=- `architecture-deep-dive`)", "",
           p.read_text(), flags=re.S)
t = t.replace("a widget (that is `creating-widget`) or to measure the bundle.",
              "a widget or to measure the bundle.")
t = t.replace("widget (`creating-widget`) or to explain", "widget or to explain")
p.write_text(t)
p = root / "AGENTS.md"
p.write_text("\n".join(l for l in p.read_text().splitlines()
                       if "creating-widget" not in l) + "\n")
PY
}

setup() {
  mkdir -p "$LAB"
  for r in "${RUNGS[@]}"; do
    rm -rf "$LAB/run$r"
    rsync -a --exclude node_modules --exclude .git --exclude dist "$SRC/" "$LAB/run$r/"
    # This experiment and its predecessor never enter the ladder: both write-ups
    # state the answer the agent is supposed to produce on its own.
    rm -rf "$LAB/run$r/docs/ab-validation.md" "$LAB/run$r/docs/task-d" \
           "$LAB/run$r/docs/task-e-bonus.md" "$LAB/run$r/docs/task-e"
  done

  # P — the committed layout: skill under .agents/, pointers intact, no .claude/ copy.
  rm -rf "$LAB/runP/.claude/skills"

  # N — the same bytes under .claude/skills/ and nothing else pointing at them.
  rm -rf "$LAB/runN/.agents/skills/creating-widget"
  scrub_pointers "$LAB/runN"

  # Z — control: the skill exists nowhere, pointers scrubbed the same way.
  rm -rf "$LAB/runZ/.agents/skills/creating-widget" "$LAB/runZ/.claude/skills"
  scrub_pointers "$LAB/runZ"

  # The task prompt: Task D's change request, verbatim, never retyped.
  python3 - "$SRC/materials/ab-task.md" "$PROMPT_FILE" <<'PY'
import re, sys, pathlib
src, dst = sys.argv[1], sys.argv[2]
body = re.search(r"^## The request\n(.*?)\nThat'?s the whole prompt",
                 pathlib.Path(src).read_text(), re.S | re.M).group(1).strip()
pathlib.Path(dst).write_text(body + "\n")
PY

  # The discovery probe: asks the tool what its loader handed it, before any file
  # is read. Scored from the trace (a Skill tool call), not from the answer text.
  cat > "$PROBE_FILE" <<'TXT'
Do not read, list or search any files. Answer only from what your tooling already
gave you at session start: name every skill available in this session. Then, if one
of them covers adding a new widget to this repo, invoke it now and stop.
TXT

  for r in "${RUNGS[@]}"; do
    ln -s "$SRC/app/node_modules" "$LAB/run$r/app/node_modules"
    git -C "$LAB/run$r" init -q
    git -C "$LAB/run$r" add -A
    git -C "$LAB/run$r" -c user.email=lab@local -c user.name=lab \
        commit -qm "portability baseline: run$r"
  done
  # Byte-identity is the whole premise: P's skill and N's skill must be one file.
  shasum -a 256 "$LAB/runP/.agents/skills/creating-widget/SKILL.md" \
                "$LAB/runN/.claude/skills/creating-widget/SKILL.md" \
    | tee "$LAB/identity.txt"
  echo "ladder ready in $LAB"
}

# rung, tag, prompt file, and whether to snapshot the widget artefacts
one_session() {
  local r=$1 tag=$2 pf=$3 snapshot=${4:-yes} d="$LAB/run$1"
  git -C "$d" reset -q --hard && git -C "$d" clean -qfd
  (cd "$d" && claude -p "$(cat "$pf")" --output-format stream-json --verbose \
      --allowedTools "${ALLOWED[@]}" > "$LAB/$tag.jsonl" 2> "$LAB/$tag.err")
  # A session killed by an API/limit error is not a data point — mark and bail so
  # it can never be counted as "the agent chose not to use the skill".
  if python3 -c "import json,sys;l=open(sys.argv[1]).read().splitlines();\
sys.exit(0 if l and json.loads(l[-1]).get('is_error') else 1)" "$LAB/$tag.jsonl" 2>/dev/null; then
    python3 -c "import json,sys;print(json.loads(open(sys.argv[1]).read().splitlines()[-1]).get('result'))" \
        "$LAB/$tag.jsonl" > "$LAB/FAILED_$tag.txt"
    echo "$tag FAILED (see FAILED_$tag.txt) — rerun this trial"
    return 1
  fi
  [ "$snapshot" = yes ] || { echo "$tag done"; return 0; }
  mkdir -p "$LAB/snap/$tag"
  cp "$d"/app/src/widgets/alert/alert*.ts "$LAB/snap/$tag/" 2>/dev/null
  cp "$d"/app/src/widgets/index.ts "$LAB/snap/$tag/" 2>/dev/null
  {
    echo "### $tag"; (cd "$d/app" && npm test 2>&1 | tail -4)
    (cd "$d/app" && npm run build >/dev/null 2>&1 && node -e \
      "import('./dist/bundle.js').then(m=>{console.log(JSON.stringify(m.listWidgets()));try{console.log(m.create('alert',{message:'Saved'}))}catch(e){console.log('THROWS: '+e.message)}})")
  } > "$LAB/post_$tag.txt" 2>&1
  echo "$tag done"
}

case "${1:-setup}" in
  setup) setup ;;
  probe) for r in "${RUNGS[@]}"; do one_session "$r" "probe$r" "$PROBE_FILE" no & done; wait ;;
  run)   for r in "${RUNGS[@]}"; do one_session "$r" "run${r}_t1" "$PROMPT_FILE" & done; wait ;;
  trials) for t in $(seq "${FROM:-2}" "${2:-3}"); do
            for r in "${RUNGS[@]}"; do one_session "$r" "run${r}_t${t}" "$PROMPT_FILE" & done; wait
            echo "=== wave $t complete ==="
          done ;;
  *) echo "usage: $0 {setup|probe|run|trials [n]}" >&2; exit 2 ;;
esac

#!/usr/bin/env bash
# Task D harness — builds the ablation ladder used by docs/ab-validation.md and
# runs the same prompt on every rung in a fresh headless session.
#
#   bash docs/task-d/ablation-harness.sh setup     # build rungs A..E
#   bash docs/task-d/ablation-harness.sh run       # one trial on every rung
#   bash docs/task-d/ablation-harness.sh trials 5  # rungs A/B/E, n trials each
#
# A wave runs its rungs CONCURRENTLY (five for `run`, three per `trials` wave)
# over one shared node_modules symlink, so per-session wall-clock is measured
# under contention. Rungs inside a wave are contended equally, so it does not
# bias the A-vs-rest comparison — but treat the seconds as soft and the turn
# counts as the load-independent number.
#
# Every rung is a full copy of the repo with a different slice of the skill
# layer removed, and its own git repo whose HEAD is the ablated baseline — so
# `git diff` after a run shows exactly what the agent changed. The working repo
# is never modified: it is only ever read (rsync source).
#
# Rungs A and B keep docs/, which by now contains this experiment's own results.
# Those would hand the agent the answer, so setup() strips ab-validation.md and
# docs/task-d/ from every rung. Rungs C/D/E drop docs/ entirely anyway.
set -uo pipefail

SRC="$(git rev-parse --show-toplevel)"
LAB="${LAB:-${TMPDIR:-/tmp}/ws05-taskd-lab}"
PROMPT_FILE="$LAB/prompt.txt"
ALLOWED=(Read Write Edit Glob Grep Bash TodoWrite)

setup() {
  mkdir -p "$LAB"
  for r in A B C D E; do
    rm -rf "$LAB/run$r"
    rsync -a --exclude node_modules --exclude .git --exclude dist "$SRC/" "$LAB/run$r/"
  done

  # This experiment's own write-up and tooling never enter the ladder — on any
  # rung, in any condition. Otherwise the agent could read the result it is
  # supposed to produce.
  for r in A B C D E; do
    rm -rf "$LAB/run$r/docs/ab-validation.md" "$LAB/run$r/docs/task-d"
  done

  # A — nothing removed: the full skill library.

  # B — walkthrough-literal: creating-widget moved OUT of .agents/skills/.
  #     Every pointer to it (app/AGENTS.md bullet, root AGENTS.md, docs/) stays.
  rm -rf "$LAB/runB/.agents/skills/creating-widget"

  # C — B, minus every trace of the skill: its bullet in app/AGENTS.md, its
  #     mentions in root AGENTS.md, docs/ (walkthrough + verification notes both
  #     restate the golden path) and the homework-meta files. Other skills stay.
  rm -rf "$LAB/runC/.agents/skills/creating-widget" "$LAB/runC/docs" \
         "$LAB/runC/README.md" "$LAB/runC/.coderabbit.yaml" "$LAB/runC/.github"
  python3 - "$LAB/runC" <<'PY'
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

  # D — no skills at all + no homework meta. app/AGENTS.md (including its
  #     now-dangling ## Skills bullets) and materials/ remain.
  rm -rf "$LAB/runD/.agents" "$LAB/runD/docs" "$LAB/runD/AGENTS.md" \
         "$LAB/runD/CLAUDE.md" "$LAB/runD/README.md" "$LAB/runD/.coderabbit.yaml" \
         "$LAB/runD/.github"

  # E — code only: no skills, no project docs. The model-prior floor.
  rm -rf "$LAB/runE/.agents" "$LAB/runE/docs" "$LAB/runE/AGENTS.md" \
         "$LAB/runE/CLAUDE.md" "$LAB/runE/README.md" "$LAB/runE/.coderabbit.yaml" \
         "$LAB/runE/.github" "$LAB/runE/materials" "$LAB/runE/app/AGENTS.md"

  # The prompt: the change request from materials/ab-task.md, verbatim, never
  # reworded between runs.
  python3 - "$SRC/materials/ab-task.md" "$PROMPT_FILE" <<'PY'
import re, sys, pathlib
src, dst = sys.argv[1], sys.argv[2]
body = re.search(r"^## The request\n(.*?)\nThat'?s the whole prompt",
                 pathlib.Path(src).read_text(), re.S | re.M).group(1).strip()
pathlib.Path(dst).write_text(body + "\n")
PY

  for r in A B C D E; do
    ln -s "$SRC/app/node_modules" "$LAB/run$r/app/node_modules"
    git -C "$LAB/run$r" init -q
    git -C "$LAB/run$r" add -A
    git -C "$LAB/run$r" -c user.email=lab@local -c user.name=lab \
        commit -qm "ablated baseline: run$r"
  done
  echo "ladder ready in $LAB"
}

one_run() {  # rung, output tag
  local r=$1 tag=$2 d="$LAB/run$1"
  git -C "$d" reset -q --hard && git -C "$d" clean -qfd
  (cd "$d" && claude -p "$(cat "$PROMPT_FILE")" --output-format stream-json --verbose \
      --allowedTools "${ALLOWED[@]}" > "$LAB/$tag.jsonl" 2> "$LAB/$tag.err")
  # A session that died on an API/limit error is not a data point. Mark it and
  # bail, so it cannot be silently counted as "the agent chose to do nothing".
  if python3 -c "import json,sys;l=open(sys.argv[1]).read().splitlines();\
sys.exit(0 if l and json.loads(l[-1]).get('is_error') else 1)" "$LAB/$tag.jsonl" 2>/dev/null; then
    python3 -c "import json,sys;print(json.loads(open(sys.argv[1]).read().splitlines()[-1]).get('result'))" \
        "$LAB/$tag.jsonl" > "$LAB/FAILED_$tag.txt"
    echo "$tag FAILED (see FAILED_$tag.txt) — rerun this trial"
    return 1
  fi
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
  setup)  setup ;;
  run)    for r in A B C D E; do one_run "$r" "run${r}_t1" & done; wait ;;
  trials) for t in $(seq 2 "${2:-5}"); do
            for r in A B E; do one_run "$r" "run${r}_t${t}" & done; wait
            echo "=== wave $t complete ==="
          done ;;
  *) echo "usage: $0 {setup|run|trials [n]}" >&2; exit 2 ;;
esac

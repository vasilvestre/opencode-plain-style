#!/usr/bin/env bash
# multiturn.sh — multi-turn A/B harness for the plain-style plugin.
# Tests rules that only exist across turns (i-have-adhd R5 "restate state
# every turn"), which the single-turn harness.sh cannot observe.
#
# Usage: multiturn.sh [reps] [--jobs 2] [--scenario NAME] [--candidate FILE]
#   reps           repetitions per cell (default 3; 0 = build/verify only)
#   --jobs 2       run control/treatment pair in parallel (default: sequential)
#   --scenario N   scenario dir under scenarios/ (default: cache-plan)
#   --candidate F  treatment rulebook override (default: plain-style.candidate.md)
#
# SAFETY: same contract as harness.sh — writes only under $BENCH, $LIVE is
# read-only, XDG_DATA_HOME untouched. Sessions live in the shared opencode
# data dir; each cell pins its own session id, so parallel arms cannot race.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib-replica.sh"

usage() { sed -n '2,12p' "$0"; }

check_live_config

REPS=3
JOBS=1
SCENARIO="cache-plan"
while (($#)); do
  case "$1" in
    --jobs)      JOBS="$2"; shift 2 ;;
    --scenario)  SCENARIO="$2"; shift 2 ;;
    --candidate) CANDIDATE_FILE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) if [[ "$1" =~ ^[0-9]+$ ]]; then REPS="$1"; shift
       else echo "unknown arg: $1" >&2; usage >&2; exit 1; fi ;;
  esac
done

SCENARIO_DIR="$BENCH/scenarios/$SCENARIO"
[[ -d "$SCENARIO_DIR" ]] || { echo "no such scenario: $SCENARIO_DIR" >&2; exit 1; }
mapfile -t TURNS < <(cd "$SCENARIO_DIR" && printf '%s\n' turn*.txt | sed 's/\.txt$//;s/^turn//' | sort -n)
(( ${#TURNS[@]} >= 2 )) || { echo "scenario needs at least turn1.txt and turn2.txt" >&2; exit 1; }

# extract <raw.json> <out.txt>: pull sessionID (stdout) and concatenated
# assistant text (out file) from `opencode run --format json` events.
extract() {
  bun -e '
    const fs = require("fs");
    let sid = "", text = "";
    for (const line of fs.readFileSync(process.argv[1], "utf8").split("\n")) {
      if (!line.trim()) continue;
      let e; try { e = JSON.parse(line); } catch { continue; }
      if (!sid && e.sessionID) sid = e.sessionID;
      if (e.type === "text" && e.part?.text) text += e.part.text;
    }
    fs.writeFileSync(process.argv[2], text);
    console.log(sid);
  ' "$1" "$2"
}

# run_turn <cond> <rep> <turn> <session>: one turn; retry once on
# failure/empty. Prints the session id on stdout (turn 1 creates it).
run_turn() {
  local cond="$1" rep="$2" turn="$3" session="$4"
  local base="$RUN_DIR/$cond/$SCENARIO-$rep-turn$turn"
  local prompt attempt sid args
  prompt="$(cat "$SCENARIO_DIR/turn$turn.txt")"
  for attempt in 1 2; do
    args=(run --format json -m "$MODEL")
    [[ -n "$session" ]] && args+=(--session "$session")
    if (cd "$NEUTRAL_CWD" && XDG_CONFIG_HOME="$BENCH/$cond" opencode "${args[@]}" "$prompt") >"$base.json" 2>"$base.err" \
       && sid="$(extract "$base.json" "$base.txt")" && [[ -n "$sid" && -s "$base.txt" ]]; then
      printf '%s' "$sid"
      return 0
    fi
    if (( attempt == 1 )); then
      printf '%s retry %s/%s-%s-turn%s\n' "$(date -Is)" "$cond" "$SCENARIO" "$rep" "$turn" >> "$RUN_DIR/retries.log"
    else
      printf '%s FAILED %s/%s-%s-turn%s\n' "$(date -Is)" "$cond" "$SCENARIO" "$rep" "$turn" >> "$RUN_DIR/retries.log"
    fi
  done
  return 1
}

# run_mt_cell <cond> <rep>: one full conversation — every turn in sequence.
run_mt_cell() {
  local cond="$1" rep="$2" turn session=""
  for turn in "${TURNS[@]}"; do
    session="$(run_turn "$cond" "$rep" "$turn" "$session")" || return 1
  done
}

# --- main ------------------------------------------------------------------

build_replica control
build_replica treatment
verify_replica control
verify_replica treatment

(( REPS > 0 )) || { echo "reps=0: build/verify done, no runs."; exit 0; }

RUN_DIR="$BENCH/runs/$(date +%Y%m%d-%H%M%S)-mt"
mkdir -p "$RUN_DIR/control" "$RUN_DIR/treatment"
: > "$RUN_DIR/retries.log"

echo "runs: $RUN_DIR (reps=$REPS jobs=$JOBS scenario=$SCENARIO turns=${TURNS[*]} model=$MODEL)"
fail=0
for (( rep=1; rep<=REPS; rep++ )); do
  if (( JOBS >= 2 )); then
    run_mt_cell control   "$rep" & p1=$!
    run_mt_cell treatment "$rep" & p2=$!
    wait "$p1" || fail=1
    wait "$p2" || fail=1
  else
    run_mt_cell control   "$rep" || fail=1
    run_mt_cell treatment "$rep" || fail=1
  fi
done

(( fail == 0 )) && echo "all cells OK" || echo "some cells FAILED (see $RUN_DIR/retries.log)"
exit "$fail"

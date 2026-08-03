#!/usr/bin/env bash
# harness.sh — A/B benchmark harness for the plain-style plugin.
#
# Usage: harness.sh [reps] [--jobs 2] [--probe NAME]
#   reps        number of repetitions per cell (default 3; 0 = build/verify only)
#   --jobs 2    run each control/treatment pair in parallel (default: sequential)
#   --probe N   run only prompts/<NAME>.txt (smoke runs)
#
# SAFETY: this script writes ONLY under $BENCH (this bench/ directory).
# The live config $LIVE is read-only input — never modified, never rm'd.
# Do NOT set XDG_DATA_HOME: opencode auth lives in ~/.local/share/opencode.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/lib-replica.sh"

usage() { sed -n '2,9p' "$0"; }

check_live_config

REPS=3
JOBS=1
PROBE=""
while (($#)); do
  case "$1" in
    --jobs)      JOBS="$2"; shift 2 ;;
    --probe)     PROBE="$2"; shift 2 ;;
    --candidate) CANDIDATE_FILE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) if [[ "$1" =~ ^[0-9]+$ ]]; then REPS="$1"; shift
       else echo "unknown arg: $1" >&2; usage >&2; exit 1; fi ;;
  esac
done

# --- run matrix ------------------------------------------------------------

# run_cell <cond> <probe> <rep>: one opencode run; retry once on failure/empty.
run_cell() {
  local cond="$1" probe="$2" rep="$3"
  local out="$RUN_DIR/$cond/$probe-$rep.txt" err="$RUN_DIR/$cond/$probe-$rep.err"
  local prompt attempt
  prompt="$(cat "$BENCH/prompts/$probe.txt")"
  for attempt in 1 2; do
    if (cd "$NEUTRAL_CWD" && XDG_CONFIG_HOME="$BENCH/$cond" opencode run -m "$MODEL" "$prompt") >"$out" 2>"$err" && [[ -s "$out" ]]; then
      return 0
    fi
    if (( attempt == 1 )); then
      printf '%s retry %s/%s-%s\n' "$(date -Is)" "$cond" "$probe" "$rep" >> "$RUN_DIR/retries.log"
    else
      printf '%s FAILED %s/%s-%s\n' "$(date -Is)" "$cond" "$probe" "$rep" >> "$RUN_DIR/retries.log"
    fi
  done
  return 1
}

# --- main ------------------------------------------------------------------

build_replica control
build_replica treatment
verify_replica control
verify_replica treatment

(( REPS > 0 )) || { echo "reps=0: build/verify done, no runs."; exit 0; }

RUN_DIR="$BENCH/runs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR/control" "$RUN_DIR/treatment"
: > "$RUN_DIR/retries.log"

mapfile -t PROBES < <(cd "$BENCH/prompts" && printf '%s\n' *.txt | sed 's/\.txt$//' | sort)
if [[ -n "$PROBE" ]]; then
  [[ -f "$BENCH/prompts/$PROBE.txt" ]] || { echo "no such probe: $PROBE" >&2; exit 1; }
  PROBES=("$PROBE")
fi

echo "runs: $RUN_DIR (reps=$REPS jobs=$JOBS probes=${PROBES[*]})"
fail=0
for (( rep=1; rep<=REPS; rep++ )); do
  for probe in "${PROBES[@]}"; do
    if (( JOBS >= 2 )); then
      run_cell control   "$probe" "$rep" & p1=$!
      run_cell treatment "$probe" "$rep" & p2=$!
      wait "$p1" || fail=1
      wait "$p2" || fail=1
    else
      run_cell control   "$probe" "$rep" || fail=1
      run_cell treatment "$probe" "$rep" || fail=1
    fi
  done
done

(( fail == 0 )) && echo "all cells OK" || echo "some cells FAILED (see $RUN_DIR/retries.log)"
exit "$fail"

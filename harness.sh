#!/usr/bin/env bash
# harness.sh — A/B benchmark harness for the plain-style plugin.
#
# Usage: harness.sh [reps] [--jobs N] [--probe NAME]
#   reps        number of repetitions per cell (default 3; 0 = build/verify only)
#   --jobs N    2 = run each control/treatment pair in parallel (default 1)
#   --probe N   run only prompts/<NAME>.txt (smoke runs)
#
# SAFETY: this script writes ONLY under $BENCH (plain-style-bench/).
# The live config $LIVE is read-only input — never modified, never rm'd.
# Do NOT set XDG_DATA_HOME: opencode auth lives in ~/.local/share/opencode.
set -euo pipefail

BENCH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
readonly BENCH
readonly LIVE="/home/vsilvestre/.config/opencode"
readonly MODEL="kimi-for-coding/k3-256k"
# opencode walks up from the cwd and merges any opencode.jsonc it finds as
# project config — the bench dir lives inside the live config tree, so every
# opencode call must run from a neutral cwd or the live config leaks in.
readonly NEUTRAL_CWD="/tmp"

if [[ "$BENCH" != "$LIVE/plain-style-bench" ]]; then
  echo "SAFETY: unexpected bench path '$BENCH' (expected '$LIVE/plain-style-bench')" >&2
  exit 1
fi

usage() { sed -n '2,9p' "$0"; }

REPS=3
JOBS=1
PROBE=""
while (($#)); do
  case "$1" in
    --jobs)  JOBS="$2"; shift 2 ;;
    --probe) PROBE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) if [[ "$1" =~ ^[0-9]+$ ]]; then REPS="$1"; shift
       else echo "unknown arg: $1" >&2; usage >&2; exit 1; fi ;;
  esac
done

# --- replica build ---------------------------------------------------------

# debug_config <arm>: dump merged config to $BENCH/.cache/<arm>.debug.json
# (bun fd-0 reads mangle this large output, so always go through a file).
debug_config() {
  mkdir -p "$BENCH/.cache"
  (cd "$NEUTRAL_CWD" && XDG_CONFIG_HOME="$BENCH/$1" opencode debug config 2>/dev/null) > "$BENCH/.cache/$1.debug.json"
}

# enabled_mcps <file>: space-separated names of MCPs with enabled:true.
enabled_mcps() {
  bun -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(Object.entries(c.mcp??{}).filter(([,m])=>m&&m.enabled===true).map(([k])=>k).join(" "))' "$1"
}

# gen_config <arm> <dst>: copy live opencode.jsonc with all mcp.*.enabled=false;
# control also drops the ./plugins/plain-style.mjs plugin entry.
gen_config() {
  local arm="$1" dst="$2"
  SRC="$LIVE/opencode.jsonc" DST="$dst" ARM="$arm" bun -e '
    const fs = require("fs");
    const src = fs.readFileSync(process.env.SRC, "utf8");
    // JSONC: drop full-line // comments only (never touch inline content);
    // JSON.parse below verifies the result parses.
    const stripped = src.split(/\r?\n/).filter(l => !/^\s*\/\//.test(l)).join("\n");
    const cfg = JSON.parse(stripped);
    for (const k of Object.keys(cfg.mcp ?? {})) cfg.mcp[k].enabled = false;
    if (process.env.ARM === "control")
      cfg.plugin = (cfg.plugin ?? []).filter(p => !String(p).includes("plain-style"));
    fs.writeFileSync(process.env.DST, JSON.stringify(cfg, null, 2) + "\n");
  '
  # Pass 2: plugins (oh-my-openagent) inject extra MCPs; a user-config entry
  # with the same name wins the merge, so stub out every injected name.
  debug_config "$arm"
  local names
  names="$(bun -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(Object.keys(c.mcp??{}).join(" "))' "$BENCH/.cache/$arm.debug.json")"
  DST="$dst" NAMES="$names" bun -e '
    const fs = require("fs");
    const cfg = JSON.parse(fs.readFileSync(process.env.DST, "utf8"));
    cfg.mcp ??= {};
    for (const n of (process.env.NAMES || "").split(" ").filter(Boolean)) {
      cfg.mcp[n] ??= { type: "local", command: ["true"] }; // ponytail: stub for plugin-injected MCPs; merge keeps real fields if deep, entry stays disabled either way
      cfg.mcp[n].enabled = false;
    }
    fs.writeFileSync(process.env.DST, JSON.stringify(cfg, null, 2) + "\n");
  '
}

# gen_omo_config <arm> <dst>: copy live oh-my-openagent.json with every
# still-enabled injected MCP added to disabled_mcps (websearch/lsp ignore
# user-config stubs; only this plugin-level switch turns them off).
gen_omo_config() {
  local arm="$1" dst="$2"
  [[ -f "$LIVE/oh-my-openagent.json" ]] || return 0
  debug_config "$arm"
  local names
  names="$(enabled_mcps "$BENCH/.cache/$arm.debug.json")"
  SRC="$LIVE/oh-my-openagent.json" DST="$dst" NAMES="$names" bun -e '
    const fs = require("fs");
    const stripped = fs.readFileSync(process.env.SRC, "utf8")
      .split(/\r?\n/).filter(l => !/^\s*\/\//.test(l)).join("\n");
    const cfg = JSON.parse(stripped);
    const dis = new Set(cfg.disabled_mcps ?? []);
    for (const n of (process.env.NAMES || "").split(" ").filter(Boolean)) dis.add(n);
    cfg.disabled_mcps = [...dis];
    fs.writeFileSync(process.env.DST, JSON.stringify(cfg, null, 2) + "\n");
  '
}

# build_replica <control|treatment>: recreate $BENCH/<arm>/opencode from live.
build_replica() {
  local arm="$1"
  [[ "$arm" == control || "$arm" == treatment ]] || { echo "bad arm: $arm" >&2; exit 1; }
  local dir="$BENCH/$arm/opencode"
  rm -rf "$dir" # safe: $BENCH validated above, $arm whitelisted
  mkdir -p "$dir/plugins"
  local item f base
  for item in agents agent skills command instructions .ponytail-active; do
    [[ -e "$LIVE/$item" ]] && ln -sfn "$LIVE/$item" "$dir/$item"
  done
  for f in "$LIVE"/plugins/*; do
    base="$(basename "$f")"
    if [[ "$arm" == control && ( "$base" == plain-style.mjs || "$base" == plain-style.md ) ]]; then
      continue
    fi
    ln -sfn "$f" "$dir/plugins/$base"
  done
  gen_config "$arm" "$dir/opencode.jsonc"
  gen_omo_config "$arm" "$dir/oh-my-openagent.json"
}

# verify_replica <arm>: print grep results; fail if expectations not met.
verify_replica() {
  local arm="$1" ps en
  debug_config "$arm"
  ps="$(grep -cE 'plain-style\.(mjs|md)' "$BENCH/.cache/$arm.debug.json" || true)"
  en="$(enabled_mcps "$BENCH/.cache/$arm.debug.json")"
  echo "--- verify $arm ---"
  echo "plain-style plugin refs: $ps"
  echo "mcp still enabled: ${en:-none}"
  if [[ "$arm" == control && "$ps" != 0 ]]; then echo "FAIL: plain-style present in control" >&2; return 1; fi
  if [[ "$arm" == treatment && "$ps" == 0 ]]; then echo "FAIL: plain-style absent in treatment" >&2; return 1; fi
  if [[ -n "$en" ]]; then echo "FAIL: MCPs still enabled in $arm: $en" >&2; return 1; fi
  echo "OK"
}

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

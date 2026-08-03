#!/usr/bin/env bash
# lib-replica.sh — shared replica build/verify for the bench harnesses.
# Source this file; do not execute it. Callers must set `set -euo pipefail`
# and may set CANDIDATE_FILE before calling build_replica.

BENCH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
readonly BENCH
readonly LIVE="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
readonly MODEL="${BENCH_MODEL:-kimi-for-coding/k3-256k}"
# opencode walks up from the cwd and merges any opencode.jsonc it finds as
# project config — if the bench dir lives inside the config tree, every
# opencode call must run from a neutral cwd or the live config leaks in.
readonly NEUTRAL_CWD="/tmp"

CANDIDATE_FILE="${CANDIDATE_FILE:-$BENCH/plain-style.candidate.md}"

check_live_config() {
  if [[ ! -f "$LIVE/opencode.jsonc" ]]; then
    echo "SAFETY: no live opencode config at '$LIVE' — this harness measures your installed config." >&2
    exit 1
  fi
}

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
# control also drops the ./plugins/plain-style.mjs plugin entry; treatment with
# a candidate file repoints plain-style entries at the local copy.
gen_config() {
  local arm="$1" dst="$2" cand=0
  [[ "$arm" == treatment && -f "$CANDIDATE_FILE" ]] && cand=1
  SRC="$LIVE/opencode.jsonc" DST="$dst" ARM="$arm" CAND="$cand" bun -e '
    const fs = require("fs");
    const src = fs.readFileSync(process.env.SRC, "utf8");
    // JSONC: drop full-line // comments only (never touch inline content);
    // JSON.parse below verifies the result parses.
    const stripped = src.split(/\r?\n/).filter(l => !/^\s*\/\//.test(l)).join("\n");
    const cfg = JSON.parse(stripped);
    for (const k of Object.keys(cfg.mcp ?? {})) cfg.mcp[k].enabled = false;
    if (process.env.ARM === "control")
      cfg.plugin = (cfg.plugin ?? []).filter(p => !String(p).includes("plain-style"));
    else if (process.env.CAND === "1")
      cfg.plugin = (cfg.plugin ?? []).map(p => String(p).includes("plain-style") ? "./plugins/plain-style.mjs" : p);
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
  # Candidate mode: treatment gets the repo plugin + candidate rulebook as
  # REAL files — ESM realpath resolution would read plain-style.md through a
  # symlink and bypass the candidate. rm first: cp onto a symlink would
  # overwrite the LIVE target.
  if [[ "$arm" == treatment && -f "$CANDIDATE_FILE" ]]; then
    rm -f "$dir/plugins/plain-style.mjs" "$dir/plugins/plain-style.md"
    cp "$BENCH/../.opencode/plugins/plain-style.mjs" "$dir/plugins/plain-style.mjs"
    cp "$CANDIDATE_FILE" "$dir/plugins/plain-style.md"
  fi
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

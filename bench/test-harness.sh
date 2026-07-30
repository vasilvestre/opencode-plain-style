#!/usr/bin/env bash
# test-harness.sh — prove candidate mode in harness.sh end-to-end.
#
# Writes a temporary marker candidate at bench/plain-style.candidate.md
# (preserving any existing file, restored on exit), runs ./harness.sh 0,
# and asserts the treatment arm picked up the marker rulebook and the repo
# plugin as REAL files with a local ./plugins/plain-style.mjs config entry.
#
# Exits 0 only if every assertion passes. Stock mode is NOT tested here:
# it stays broken-by-design until a candidate file exists.
set -uo pipefail

BENCH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
CANDIDATE="$BENCH/plain-style.candidate.md"
TREAT="$BENCH/treatment/opencode"

# --- preserve any existing candidate (belongs to a parallel task) ----------
backup=""
if [[ -f "$CANDIDATE" ]]; then
  backup="$(mktemp)"
  cp "$CANDIDATE" "$backup"
fi
restore() {
  if [[ -n "$backup" && -f "$backup" ]]; then
    cp "$backup" "$CANDIDATE"
    rm -f "$backup"
  else
    rm -f "$CANDIDATE"
  fi
}
trap restore EXIT

# --- (a) write the temp marker candidate ------------------------------------
printf '# test candidate\nEvery response must begin with the exact word ZEBRA.\n<!-- test-harness run %s -->\n' \
  "$(date +%s%N)" > "$CANDIDATE"

# --- (b) build + verify both replicas ---------------------------------------
output="$("$BENCH/harness.sh" 0 2>&1)"
rc=$?
echo "$output" | sed 's/^/  harness| /'

pass=0
fail=0
check() { # check <label> <0=pass>
  if [[ "$2" -eq 0 ]]; then
    echo "PASS: $1"
    pass=$((pass + 1))
  else
    echo "FAIL: $1"
    fail=$((fail + 1))
  fi
}

# --- (c) harness exit + both arms verify ------------------------------------
[[ "$rc" -eq 0 ]]; check "harness.sh 0 exits 0" $?
[[ "$(grep -c '^OK$' <<<"$output")" == 2 ]]; check "both arms verify OK" $?

# --- (d) treatment rulebook equals the marker candidate ---------------------
cmp -s "$CANDIDATE" "$TREAT/plugins/plain-style.md"; check "treatment plain-style.md == candidate marker" $?

# --- (e) treatment plugin is a real file, not a symlink ---------------------
[[ -f "$TREAT/plugins/plain-style.mjs" && ! -L "$TREAT/plugins/plain-style.mjs" ]]; check "treatment plain-style.mjs is a regular file" $?

# --- (f) treatment config points at the local plugin, not the npm name ------
grep -qF './plugins/plain-style.mjs' "$TREAT/opencode.jsonc"; check "treatment config contains ./plugins/plain-style.mjs" $?
grep -qF '@vasilvestre' "$TREAT/opencode.jsonc"; rc_v=$?
[[ "$rc_v" -ne 0 ]]; check "treatment config drops @vasilvestre npm name" $?

echo "---"
echo "passed=$pass failed=$fail"
(( fail == 0 ))

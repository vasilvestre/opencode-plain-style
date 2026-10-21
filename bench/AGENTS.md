# AGENTS.md: benchmark suite

A/B benchmark that measures the plain-style rulebook. Same agent, same pinned
model, two config replicas that differ only in the plugin. Deterministic
scoring, zero LLM judging. Maintainer policy (experiment log, rule gates,
variant immutability) lives in the root `AGENTS.md`.

## Where to look

| Task | Location | Notes |
| ---- | -------- | ----- |
| Run a benchmark | `harness.sh` | Builds replicas, runs probes, writes `runs/<timestamp>/` |
| Score one transcript | `score.mjs` | Exports `analyzeText` and `analyzeFile` |
| Aggregate a run | `aggregate.mjs` | `METRICS` table drives all output rows |
| Probe prompts | `prompts/*.txt` | Blind probes, one per file |
| Scorer fixtures | `fixtures/` | Compliant and violating samples for tests |
| Aggregator test data | `testdata/mini-runs/` | Tiny fake run dir for `test-aggregate.mjs` |
| Ablation snapshots | `variants/` | Immutable. See root `AGENTS.md` |
| Candidate rulebook | `plain-style.candidate.md` | Passed via `--candidate` |

## Entry points

- `harness.sh`: main driver. Sources `lib-replica.sh`, calls `opencode run`,
  writes raw transcripts to `runs/<timestamp>/{control,treatment}/*.txt`.
- `score.mjs`: scorer library plus CLI (`node score.mjs [--json] file.txt`).
- `aggregate.mjs`: `node aggregate.mjs runs/<timestamp>` writes `results.json`
  and `scoreboard.md` into the run dir.
- `test-scorer.mjs`, `test-aggregate.mjs`, `test-harness.sh`: unit and smoke
  tests. Run with `node`.
- `multiturn.sh`: alternate multi-turn harness.

## Commands

```bash
./harness.sh 0                          # smoke check: build and verify replicas only
./harness.sh 1 --probe commit-msg       # single probe
./harness.sh 3 --jobs 2                 # standard run, 30 transcripts
node test-scorer.mjs                    # scorer unit tests
node test-aggregate.mjs                 # aggregator unit tests
```

## Gotchas

- Requires a live opencode config at `$XDG_CONFIG_HOME/opencode/opencode.json`
  (default `~/.config/opencode/opencode.json`). The harness exits if missing.
- Requires `bun` for inline JS snippets. Without it, replica generation fails.
- Each run sets `XDG_CONFIG_HOME` to the per-arm replica and runs opencode from
  `/tmp`. This keeps the repo's own config out of the benchmark.
- The harness stubs every MCP with `{ command: ["true"] }` and disables it.
  No MCP may leak into a run.
- In `--candidate` mode the treatment plugin files are real copies, not
  symlinks. ESM resolution must read the candidate rulebook, not the live one.
- Each cell retries once on failure. See `runs/<timestamp>/retries.log`.
- `runs/` is large and mostly gitignored. Commit only baseline runs that the
  README links to.

## Scoring

`score.mjs` checks banned intensifiers, hedge words, long sentences, passive
voice, and structural rules (a `Next:` line, list length, em dashes, openers).
`aggregate.mjs` maps each check to one scoreboard row via its `METRICS` table.
Add a new check in `score.mjs` first, then add one row to `METRICS`, then
extend both test files.

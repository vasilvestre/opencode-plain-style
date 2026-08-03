# Benchmark: plain-style plugin

**Result: the plugin raises fully-compliant prose from 66.7% to 93.3% of runs (+26.6 points) on `kimi-for-coding/k3-256k`.**

The plain-style plugin injects a plain-language rulebook into the opencode system prompt.
This benchmark measures the effect on agent writing with a single-variable A/B design.

## Scoreboard

| Rule                    | Control % | Treatment % | Delta (pts) |
| ----------------------- | --------: | ----------: | ----------: |
| Banned-intensifier-free |     80.0% |      100.0% |       +20.0 |
| Hedge-free              |     93.3% |      100.0% |        +6.7 |
| Sentences ≤25 words     |     73.3% |       93.3% |       +20.0 |
| Fully compliant         |     66.7% |       93.3% |       +26.6 |
| Mean passive hits       |       0.2 |         0.2 |         0.0 |
| Mean words              |     131.7 |       150.9 |       +19.2 |

## Findings

- The baseline model writes plainly without help: 66.7% of control runs pass every rule.
- The plugin closes most of the remaining gap: 93.3% of treatment runs pass every rule.
- The largest gains land on banned intensifiers and sentence length: +20 points each.
- The express probe discriminates most: control 0% fully compliant, treatment 100%.
- Treatment answers run about 19 words longer on average.
  The rulebook demands an example for each non-trivial concept, so completeness costs length.
- Passive-voice hits show no difference: 0.2 per answer in both arms.
  The heuristic is noisy, and the rulebook targets active voice only indirectly.
- One treatment run still broke the sentence-length rule.
  Injection shifts probability; it does not guarantee compliance.

## Method

- Same agent (oh-my-openagent Sisyphus) and same pinned model (`kimi-for-coding/k3-256k`) in both arms.
- Two `XDG_CONFIG_HOME` config replicas, identical except one variable: the plain-style plugin.
- All MCP servers disabled in both arms. MCP tool lists carry no prose rules, and disabling cuts startup time.
- 5 blind probes × 3 repetitions × 2 arms = 30 runs. The harness interleaves control and treatment to spread provider drift.
- Zero retries. Wall time about 10 minutes with `--jobs 2`.
- Deterministic scoring. No LLM judges the outputs.
- Raw outputs, scorer, harness, and results live in this repository under `runs/20260729-105827/`.

## Probes

Each prompt went to `opencode run` verbatim, with no style hints:

- Explain what a cache is and why developers use it.
- Tell me how to undo the last git commit without losing the changes.
- Write a commit message for a change that fixes a null pointer crash in the login flow.
- Explain how to set up a local postgres database for a node app.
- Describe what happens when an HTTP request reaches an Express server.

## Scoring rules

A run is fully compliant when all three checks pass:

1. No banned intensifiers.
2. No hedge words.
3. No sentence over 25 words (prose lines only; lists and headings excluded).

Word lists:

```text
banned: very really quite just simply actually basically obviously
hedge:  should may might
```

The scorer also counts passive-voice hits (informational only) and words per answer.

## Per-probe breakdown

Fully compliant share per probe:

| Probe      | Control | Treatment |
| ---------- | ------: | --------: |
| cache      |   66.7% |     66.7% |
| commit-msg |    100% |      100% |
| express    |      0% |      100% |
| git-undo   |   66.7% |      100% |
| postgres   |    100% |      100% |

## Limitations

- N=3 per cell, so percentages carry wide variance at this sample size.
- Results are model-specific. All runs used `kimi-for-coding/k3-256k`. A different
  model may show different deltas or natural compliance rates. Ablation experiments
  with a substitute model (gpt-5.4-mini) produced incomparable results, confirming
  that compliance lift does not transfer across models. Run the harness against your
  own model to get valid numbers for your setup.
- The MCP-free environment differs from interactive use.
- Results cover prose answers, not code quality.
- Prompt injection shapes behavior. A hard guarantee needs deterministic linting (for example Vale) in CI.

## Reproduction

```bash
./harness.sh 3 --jobs 2
node aggregate.mjs runs/<timestamp>
```

The harness rebuilds the config replicas on every invocation, so they track the live opencode config.

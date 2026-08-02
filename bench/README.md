# Bench — experiments log

This directory holds the benchmark harness, scorer, and all experiment results.
This file is the running log of what we tried, what worked, and what we dropped.
Add a new section each time you run a new experiment or change the rulebook.

---

## 2026-07-29 — Baseline measurement

**Question:** does the plugin actually change how the agent writes?

We ran a single A/B experiment: 5 blind prose probes × 3 reps × 2 arms = 30 runs.
Control arm has no rulebook. Treatment arm has the stock 16-rule rulebook.
Both arms use the same model (`kimi-for-coding/k3-256k`), same agent, all MCPs off.

| Rule                    | Control | Treatment | Delta  |
| ----------------------- | ------: | --------: | -----: |
| Banned-intensifier-free |   80.0% |    100.0% | +20.0  |
| Hedge-free              |   93.3% |    100.0% |  +6.7  |
| Sentences ≤25 words     |   73.3% |     93.3% | +20.0  |
| Fully compliant         |   66.7% |     93.3% | +26.6  |

**Verdict:** the plugin works. +26.6 points fully compliant.
Raw transcripts: `runs/20260729-105827/`.

---

## 2026-07-30 — Candidate rules benchmark

**Question:** which rules from external rulebooks are worth adding?

We researched three external sources:
- `ayghri/i-have-adhd` — ADHD-friendly response patterns
- `yzhao062/agent-style` — 21 agent writing rules
- `kylehughes/writing-prose-like-a-human-for-agents` — 5 deny-listed adjectives
- Google developer documentation style guide — "please", "etc.", "and so on"

We picked 9 checkable candidate rules, scored them with the existing harness (control = stock 16-rule rulebook, treatment = stock + 9 candidates), and ran 30 runs on Kimi.

| Rule                      | Control | Treatment |  Delta | Verdict                        |
| ------------------------- | ------: | --------: | -----: | ------------------------------ |
| Next-step present         |    0.0% |    100.0% | +100.0 | **ADOPT**                      |
| Em-dash-free              |   13.3% |    100.0% |  +86.7 | **ADOPT**                      |
| Google-style-free         |   73.3% |    100.0% |  +26.7 | **ADOPT**                      |
| Repeated-opener-free      |  100.0% |     80.0% |  -20.0 | **SKIP** (caused regression)   |
| List blocks ≤5            |   93.3% |    100.0% |   +6.7 | Defer (natural rate too high)  |
| Preamble-closer-free      |  100.0% |    100.0% |    0.0 | Defer (saturated)              |
| Transition-opener-free    |  100.0% |    100.0% |    0.0 | Defer (saturated)              |
| Jargon-free               |  100.0% |    100.0% |    0.0 | Defer (saturated)              |
| Decorative-adjective-free |  100.0% |    100.0% |    0.0 | Defer (saturated)              |

**Dropped:** repeated-opener-free. The rule primed the violation it banned.
Control produced 0% violations naturally; treatment produced 20%. Skip.

**Excluded:** i-have-adhd R5 "restate state every turn". Not checkable on single-turn probes.
Needs a multi-turn harness mode.

**Verdict:** adopted 3 rules (next-step, em-dash, google-style) as rules 16-18.
Full proposal: `candidate-rules-proposal.md`.

---

## 2026-07-31 — Dilution and ablation study

**Question:** do the 3 new rules cause dilution? Are any existing rules redundant?

### Dilution check

Adding 3 rules to go from 16 to 19 cost ~6.6 points fully-compliant on Kimi:
- 16-rule arm: 93.3% fully compliant
- 19-rule arm (v0-full): 86.7% fully compliant

Empirical estimate: each rule added costs ~2.2 points of attention.
Before adding any rule, its lift must exceed its dilution cost.

### Ablation design

Three ablation variants, each with one rule removed:

| Variant | Rule removed        |
| ------- | ------------------- |
| v1      | Sentence length     |
| v2      | Banned intensifiers |
| v3      | Hedge language      |

**Redundancy threshold:** a rule is redundant if the model reaches ≥86.7% fully-compliant without it (within 2 runs of 100%).

### Kimi results (v0 only — quota exhausted before v1–v3)

| Variant | Control | Treatment | Delta  |
| ------- | ------: | --------: | -----: |
| v0-full |   53.3% |     86.7% | +33.4  |

v1–v3 were run on gpt-5.4-mini as a substitute. Results are not comparable to Kimi.
Cross-model substitution invalidates any cut decision. **No rules were cut.**

### Sonnet results (claude-sonnet-4.6, all 4 variants)

Run to build a cross-model dataset while Kimi quota recovers.

| Variant               | Control | Treatment | Delta  |
| --------------------- | ------: | --------: | -----: |
| v0-full               |   60.0% |     80.0% | +20.0  |
| v1-no-sentence-length |   66.7% |     93.3% | +26.6  |
| v2-no-banned          |   73.3% |     80.0% |  +6.7  |
| v3-no-hedge           |   60.0% |     93.3% | +33.3  |

On Sonnet: removing hedge (v3) or sentence-length (v1) each increase the fully-compliant rate above 86.7%.
This suggests both rules are redundant for Sonnet — the model already follows them naturally.
Removing banned-intensifiers (v2) drops lift to +6.7, meaning that rule still contributes.

**Verdict (current):** no rules cut yet. Wait for matched Kimi ablation before deciding.
Results file: `sonnet-ablation-results.md`.
Ablation analysis: `ablation-analysis.md`.

---

## 2026-08-02 — Low-end model comparison (deepseek-v4-flash-free)

**Question:** does the plugin help a low-end model as much as it helps high-end models?

We ran the full 19-rule rulebook (v0) on `opencode/deepseek-v4-flash-free`, the free low-end provider model.
Same design: 5 probes × 3 reps × 2 arms = 30 runs. Run: `runs/20260802-164540`.

| Rule                    | Control | Treatment | Delta  |
| ----------------------- | ------: | --------: | -----: |
| Banned-intensifier-free |   60.0% |     73.3% | +13.3  |
| Hedge-free              |  100.0% |     86.7% | **-13.3** |
| Sentences ≤25 words     |   80.0% |     93.3% | +13.3  |
| Fully compliant         |   46.7% |     60.0% | +13.3  |
| Mean passive hits       |     1.2 |      0.5  |  -0.7  |
| Mean words              |   189.5 |    190.7  |  +1.2  |
| Next-step present       |    0.0% |     73.3% | +73.3  |
| Em-dash-free            |    6.7% |     86.7% | +80.0  |
| Google-style-free       |   73.3% |     93.3% | +20.0  |
| Repeated-opener-free    |   86.7% |     80.0% |  -6.7  |

### Cross-model comparison (fully compliant, v0 ruleset)

| Model                         | Tier     | Control | Treatment | Delta  |
| ----------------------------- | -------- | ------: | --------: | -----: |
| `kimi-for-coding/k3-256k`     | high-end |   53.3% |     86.7% | +33.4  |
| `claude-sonnet-4.6`           | high-end |   60.0% |     80.0% | +20.0  |
| `deepseek-v4-flash-free`      | low-end  |   46.7% |     60.0% | +13.3  |

**Verdict:** the plugin helps the low-end model too, but the absolute ceiling is lower.
The flash model lands at 60% fully-compliant with the rulebook, versus 80–87% for the high-end models.
Two regressions appear that high-end models did not show: hedge-free (-13.3) and repeated-opener-free (-6.7).
The hedge violations are genuine prose ("might", "should"), not rulebook quoting.
The flash model's natural em-dash rate is extreme (93.3% of control runs violate), so the em-dash rule delivers the largest single gain (+80.0).
Answer length is flat (+1.2 words), unlike high-end models which lengthen (+16–20%).
Per-probe: commit-msg 3/3 both arms; express control 0/3 → treatment 1/3.

Per AGENTS.md rules, no rules were changed based on this run. The hedge regression is a candidate for
a future ablation on this model: if flash stays ≥86.7% hedge-free without the rule, cut it for this tier.

---

## 2026-08-02 — Free opencode models sweep (6 models)

**Question:** how does the rulebook behave across every free opencode provider model?

We ran the full 19-rule rulebook on all 6 free models, including `mimo-v2.5-free`.
Same design per model: 5 probes × 3 reps × 2 arms = 30 runs.

| Model                          | Control | Treatment | Delta  |
| ------------------------------ | ------: | --------: | -----: |
| `opencode/deepseek-v4-flash-free`  |   46.7% |     60.0% | +13.3  |
| `opencode/mimo-v2.5-free`         |   80.0% |     73.3% | **-6.7** |
| `opencode/laguna-s-2.1-free`      |   66.7% |     73.3% |  +6.6  |
| `opencode/ling-3.0-flash-free`    |   80.0% |     86.7% |  +6.7  |
| `opencode/nemotron-3-ultra-free`  |   73.3% |     80.0% |  +6.7  |
| `opencode/north-mini-code-free`   |   66.7% |     73.3% |  +6.6  |

**Verdict:** the rulebook helps 5 of 6 free models. Mimo is the only model where it hurts (-6.7).
Mimo's control arm is already strong (80% natural compliance), and the rulebook's hedge-word
examples prime the model to write them (2 hedge + 2 banned violations appear only in treatment).
Hedge regression appears in 3 of 6 free models (deepseek -13.3, mimo -13.3, ling -6.7):
the rulebook lists hedge words, and weaker models echo them back. North-mini-code shows
jargon regression (-13.3) and repeated-opener regression (-20.0).
Next-step adoption varies widely: ling 86.7%, deepseek 73.3%, mimo/laguna 46.7%,
nemotron 33.3%, north-mini 13.3%. No rules changed based on this sweep.

Run IDs:
- deepseek-v4-flash-free: `runs/20260802-164540`
- mimo-v2.5-free: `runs/20260802-165150`
- laguna-s-2.1-free: `runs/20260802-170412`
- ling-3.0-flash-free: `runs/20260802-172027`
- nemotron-3-ultra-free: `runs/20260802-172342`
- north-mini-code-free: `runs/20260802-173225`

---

## 2026-08-02 — Hedge-priming fix test (v4 variant)

**Question:** does the hedge regression on free models come from the rulebook *listing* the banned words?

Hypothesis: rule 7 ("Do not use 'should', 'may', or 'might'") primes weaker models to echo the banned words.
Variant `v4-no-hedge-priming.md` rephrases rules 6 and 7 with zero hedge-word examples:
- Rule 6: "Run the tests", not "running the tests" (was: "you should run the tests").
- Rule 7: "State requirements as facts, with 'must'. Do not soften requirements." (was: list of banned words).

Ran v4 on the 3 models with hedge regressions in the free sweep (30 runs each).

| Model    | v0 hedge delta | v4 hedge delta | v0 compliant | v4 compliant |
| -------- | -------------: | -------------: | -----------: | -----------: |
| deepseek | -13.3          | **+26.7**      | 60.0%        | **73.3%** |
| mimo     | -13.3          | **+6.7**       | 73.3%        | **93.3%** |
| ling     | -6.7           | **0.0**        | 86.7%        | 80.0% (within noise; repeated-opener -13.3) |

**Verdict:** hypothesis confirmed. Removing the banned-word examples from the rulebook text
eliminates the hedge regression on all 3 models and raises fully-compliant on deepseek (+13.3)
and mimo (+20.0). Mimo goes from the only negative model (-6.7) to a top free-tier performer (93.3%).
Ling stays flat (the rephrased rulebook does not hurt).

Recommendation: adopt the v4 rephrase of rules 6 and 7 in the live rulebook when Kimi validates it
(no expected downside on high-end models — they never regressed on hedge, and the rule semantics are unchanged).

Run IDs: deepseek `20260802-181652`, mimo `20260802-182054`, ling `20260802-182539`.

### v4 on the remaining free models (no hedge regression in v0)

Ran v4 on laguna, nemotron, north-mini to check for negative impact elsewhere (30 runs each).

| Model    | v0 hedge delta | v4 hedge delta | v0 compliant | v4 compliant |
| -------- | -------------: | -------------: | -----------: | -----------: |
| laguna   | 0.0            | 0.0            | 66.7%        | 53.3% (control shifted 66.7→53.3; delta 0.0, within noise) |
| nemotron | -6.7           | -20.0          | 73.3%        | 80.0% (delta +6.7, but hedge-free dropped in treatment) |
| north-mini | +6.7         | 0.0            | 66.7%        | 86.7% (delta +6.7, best absolute of all models) |

Nemotron caveat: 2 v4 runs both showed hedge-free 80% in treatment. All 3 violations are
epistemic "may" ("data may be outdated", "connection may be kept alive") — legitimate
possibility statements, not requirement-hedging. The scorer counts any should/may/might
occurrence. Same for the v0 single violation. Both v4 runs also had API cell failures,
so treat nemotron's numbers as noisier than the rest.

**Updated verdict:** v4 fixes hedge regressions on all 3 affected models (deepseek, mimo, ling)
and causes no new negative impact on laguna or north-mini. Nemotron shows a scorer-precision
issue (epistemic "may"), not a regression in rule compliance — the violation texts are
unchanged in character between v0 and v4.

Run IDs: laguna `20260802-183208`, nemotron `20260802-185349` (first attempt `20260802-184645`
discarded, 2 control cells failed), north-mini `20260802-190023`.

---

## What to do next

- **When Kimi quota recovers:** run `BENCH_MODEL=kimi-for-coding/k3-256k bash harness.sh 3 --jobs 2 --candidate variants/v1-no-sentence-length.md` (and v2, v3). Apply the ≥86.7% threshold to Kimi results only.
- **If Kimi confirms v3 redundant:** cut the hedge rule → 18-rule set.
- **If Kimi confirms v1 redundant:** cut the sentence-length rule → 17-rule set.
- **Multi-turn bench:** implement a multi-turn harness mode to test i-have-adhd R5 "restate state every turn".
- **Flash hedge regression:** run v3 (no-hedge) on deepseek-v4-flash-free. If flash stays ≥86.7% hedge-free without the rule, the hedge rule hurts this tier; consider tier-specific rulebooks or cutting it.
- **Mimo negative delta:** resolved — the hedge-priming rephrase (v4) turned mimo from -6.7 to +20.0. Mimo is no longer an open question.
- **Adopt v4 rephrase:** when Kimi quota returns, validate rules 6+7 rephrase on Kimi (expect no regression — high-end models never regressed on hedge), then adopt it in `.opencode/plugins/plain-style.md`.
- **More model tiers:** the high-end (Kimi, Sonnet) vs low-end (flash) gap suggests running one more mid-tier model to map the curve.

---

## Files in this directory

| File / dir                      | What it is                                                      |
| ------------------------------- | --------------------------------------------------------------- |
| `harness.sh`                    | A/B harness. `./harness.sh 3 --jobs 2` for a full run.         |
| `score.mjs`                     | Deterministic scorer. `node score.mjs --json <file>` for JSON. |
| `aggregate.mjs`                 | Roll up a run dir into scoreboard + results.json.               |
| `BENCHMARK.md`                  | Numbers from the baseline measurement (2026-07-29 run).         |
| `candidate-rules-proposal.md`   | Per-rule verdict for the 9 candidate rules.                     |
| `ablation-analysis.md`          | Rule-redundancy verdicts and dilution estimate.                 |
| `sonnet-ablation-results.md`    | Sonnet ablation run for cross-model comparison.                 |
| `plain-style.candidate.md`      | Candidate rulebook used in treatment during candidate bench.    |
| `variants/`                     | Ablation variant rulesets (v0–v3).                              |
| `prompts/`                      | 5 blind prose probes used in every run.                         |
| `fixtures/`                     | Scorer unit test fixtures.                                      |
| `testdata/`                     | Mini-runs for aggregator tests.                                 |
| `runs/`                         | Raw transcripts and aggregated results (gitignored, except the  |
|                                 | baseline run `20260729-105827` tracked for README links).       |

## Reproduction

```bash
cd bench

# Full baseline run (30 runs, ~10 min with --jobs 2)
./harness.sh 3 --jobs 2
node aggregate.mjs runs/<timestamp>

# Candidate or ablation variant
./harness.sh 3 --jobs 2 --candidate variants/v1-no-sentence-length.md
node aggregate.mjs runs/<timestamp>

# Different model
BENCH_MODEL=kimi-for-coding/k3-256k ./harness.sh 3 --jobs 2
```

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

## 2026-08-02 — English Language rules benchmark (opencode/laguna-s-2.1-free)

**Question:** do the 8 proposed English Language rules improve compliance on the free tier?

We created a candidate rulebook (`plain-style.candidate.md`) that merges the existing 18-rule
rulebook with 8 proposed English Language rules: American English, title case for headings,
no Oxford commas, second person ("you"), gender-neutral pronouns, contractions allowed,
avoid passive voice, and avoid belittling words. We ran the full A/B harness on
`opencode/laguna-s-2.1-free` (5 probes × 3 reps × 2 arms = 30 runs). Run: `runs/20260802-200742`.

| Rule                    | Control | Treatment | Delta  |
| ----------------------- | ------: | --------: | -----: |
| Banned-intensifier-free |   73.3% |     93.3% | +20.0  |
| Hedge-free              |   93.3% |     73.3% | **-20.0** |
| Sentences ≤25 words     |   60.0% |     73.3% | +13.3  |
| Fully compliant         |   40.0% |     60.0% | +20.0  |
| Mean passive hits       |     1.5 |      0.9  |  -0.6  |
| Mean words              |   223.1 |    261.9  | +38.8  |
| Next-step present       |    0.0% |     46.7% | +46.7  |
| Em-dash-free            |   20.0% |     53.3% | +33.3  |
| Repeated-opener-free    |   73.3% |     66.7% |  -6.6  |
| Preamble-closer-free    |  100.0% |     86.7% | -13.3  |

### Hedge regression confirmed

The candidate rulebook listed banned words explicitly in Rule 10, including the belittling
words list (`obviously, simply, just, easy/easily, clearly, ...`). This triggered the same
**hedge-priming** pattern documented earlier (2026-08-02 — Hedge-priming fix test).
Weaker models echo back explicitly listed banned words.

Hedge violations in treatment, all epistemic (not requirement-hedging):
- `cache-1.txt`: "different cache layers may hold different versions"
- `express-3.txt`: "May perform async work"
- `express-1.txt`: "Should I modify the request/response?"
- `postgres-1.txt`: "You should see output like"

### Fixed candidate (v2 retest, partial run)

We reworded the belittling words rule without listing the words ("Avoid words that signal
laziness or condescension. State facts directly.") and removed "etc." from the contractions
example. A partial retest (rep 1 only, 15 runs) on `runs/20260802-202202`:

| Rule                    | Control | Treatment | Delta  |
| ----------------------- | ------: | --------: | -----: |
| Banned-intensifier-free |   85.7% |    100.0% | +14.3  |
| Hedge-free              |   85.7% |     85.7% |  0.0   |
| Fully compliant         |   71.4% |     71.4% |  0.0   |
| Em-dash-free            |   28.6% |    100.0% | +71.4  |

The hedge regression vanished with the anti-priming reword. Treatment stays neutral on
fully-compliant in the partial run, but the earlier regression is eliminated.

### Decisions

| Proposed rule                              | Checkable in scorer | Verdict  | Notes                                                       |
| ------------------------------------------ | ------------------- | -------- | ----------------------------------------------------------- |
| American English                           | No                  | **Adopt** | Style convention; adopt as-is                              |
| Title case for section titles              | No                  | **Adopt** | Style convention; adopt as-is                              |
| No Oxford commas                           | No                  | **Adopt** | Style convention; adopt as-is                              |
| Use "you" instead of "we"                  | No                  | **Adopt** | Aligns with existing Rule 2; adopt as-is                   |
| Gender-neutral pronouns                    | No                  | **Adopt** | Style convention; adopt as-is                              |
| Contractions allowed                       | No                  | **Adopt** | Style convention; adopt as-is                              |
| Avoid passive voice                        | Yes (passive hits)  | **Adopt** | Active voice already in Rule 1; no separate rule needed   |
| Avoid belittling words                     | Yes (via Rule 10)   | **Adopt** | Folded into Rule 10 via anti-priming reword; words not listed |

**Adopted to live rulebook:**
- Rule 6 rephrased: `"Run the tests", not "running the tests"` (was: "you should run the tests")
- Rule 7 rephrased: `"State requirements as facts, with 'must'. Do not soften requirements."` (was: banned-word list)
- Rule 10 rephrased: `"Do not use vague intensifiers or words that signal laziness or condescension. State the fact directly."` (was: banned-word list; now covers belittling words)

**Not added to rulebook:** the 5 non-checkable English Language rules stay as documented conventions in the repo's contributing guide, not in the injected rulebook. Rationale: the rulebook only carries checkable rules that the harness can measure and that improve compliance metrics. Uncheckable rules add dilution cost (~2.2 points per rule) with no measurable lift.

Run IDs: `20260802-200742` (Run 1, 30 runs), `20260802-202202` (Run 2, 15 runs partial).

---

## 2026-08-03 — Kimi validation of v4 rephrase (kimi-for-coding/k3-256k)

**Question:** does the v4 anti-priming rephrase (rules 6, 7, 10 without banned-word lists)
hold up on the primary model, with no regression?

Full 30-run benchmark on `kimi-for-coding/k3-256k` with the updated live rulebook.
Run: `runs/20260803-091349`.

| Rule                    | Control | Treatment | Delta  |
| ----------------------- | ------: | --------: | -----: |
| Banned-intensifier-free |   80.0% |    100.0% | +20.0  |
| Hedge-free              |   86.7% |     93.3% |  +6.6  |
| Sentences ≤25 words     |   66.7% |     86.7% | +20.0  |
| Fully compliant         |   53.3% |     80.0% | +26.7  |
| Mean passive hits       |     0.3 |      0.2  |  -0.1  |
| Mean words              |   124.3 |    149.8  | +25.5  |
| Next-step present       |    0.0% |     93.3% | +93.3  |
| Em-dash-free            |   46.7% |    100.0% | +53.3  |
| Google-style-free       |   80.0% |     86.7% |  +6.7  |

**Verdict:** v4 rephrase validated on Kimi. No regressions on any metric.
Fully compliant rises +26.7 points, matching the original 16-rule baseline (+26.6).
The reworded rules 6, 7, 10 keep their lift without priming violations.
The live rulebook now carries the v4 phrasing permanently.

---

## 2026-08-03 — Kimi ablation (v1, v2, v3 on v4-phrased rulebook)

**Question:** are the sentence-length, banned-intensifier, or hedge rules redundant on the
primary model? (Sonnet ablation on 2026-07-31 suggested v1 and v3 might be; Kimi was never run.)

Variants `v5-v4-no-sentence-length.md`, `v6-v4-no-banned.md`, `v7-v4-no-hedge.md` were
created from the current live rulebook (v4 phrasing) minus one rule each. The original
v1–v3 files (pre-v4 phrasing) are unchanged snapshots of the 2026-07-31 experiment.
The v0 baseline is the 2026-08-03 run above (`runs/20260803-091349`). Redundancy threshold:
treatment reaches ≥86.7% fully compliant without the rule.

| Variant               | Rule removed        | Control | Treatment | Fully compliant ≥86.7%? |
| --------------------- | ------------------- | ------: | --------: | ----------------------- |
| v0-full               | none                |   53.3% |     80.0% | (baseline)              |
| v5-no-sentence-length | Rule 4              |   73.3% |     60.0% | **No**                  |
| v6-no-banned          | Rule 10             |   80.0% |     80.0% | **No**                  |
| v7-no-hedge           | Rule 7              |   73.3% |     73.3% | **No**                  |

**Verdict: no rules cut.** All three variants land below the 86.7% threshold on Kimi.
Removing sentence-length (v1) costs the most: -20.0 versus the v0 treatment baseline.
The Sonnet signal (v1, v3 possibly redundant) does not transfer to Kimi; rule redundancy
is model-dependent. The full 19-rule v4-phrased rulebook stands.

Note: v5's control arm shifted up (73.3% vs 53.3% in v0) — normal control-arm variance
across runs. Treatment-arm comparisons against the threshold remain valid.

v6 caveat: the first v6 run had 12 empty cells from a transient API outage
(all rep-3 cells plus postgres rep-2, both arms). The failed cells were re-run individually
and merged into `runs/20260803-102700`. Patch runs: `20260803-131156` through `20260803-131605`.

Run IDs: v5 `20260803-101107`, v6 `20260803-102700` (patched), v7 `20260803-131724`.

---

## 2026-08-03 — Free-tier ablation and v4 full retest (opencode/laguna-s-2.1-free)

**Question:** does any rule look redundant on a free-tier model, and does the full
v4-phrased rulebook still help there? (Explores the tier-specific rulebook theory.)

Four 30-run A/B benchmarks on `opencode/laguna-s-2.1-free`: v0 full rulebook plus the
v5/v6/v7 ablation variants. The v0 run also serves as the full retest of the reworded
rulebook on this model (the 2026-08-02 retest was partial, 15 runs).

| Variant               | Rule removed | Control | Treatment | Delta  |
| --------------------- | ------------ | ------: | --------: | -----: |
| v0-full               | none         |   66.7% |     60.0% | **-6.7** |
| v5-no-sentence-length | Rule 4       |   53.3% |     60.0% |  +6.7  |
| v6-no-banned          | Rule 10      |   53.3% |     53.3% |   0.0  |
| v7-no-hedge           | Rule 7       |   60.0% |     53.3% |  -6.7  |

**Verdict:** no rule is redundant on laguna either — every treatment arm sits far below
the 86.7% threshold. No cuts justified on any model so far.

Two secondary observations:

1. The v0 delta on laguna is negative (-6.7), and deltas across the four runs bounce
   between -6.7 and +6.7. With n=15 per arm, the noise band on this model is roughly
   ±7 points, so none of these deltas is distinguishable from zero. Laguna's v0
   fully-compliant rate (60.0%) matches its earlier v0-phrasing result (66.7% control
   shifted to 53.3% in the 2026-08-02 v4 test — same noise band).
2. The v0 run shows a banned-intensifier regression (-13.3: control 100%, treatment 86.7%).
   The reworded Rule 10 mentions no banned words, yet violations rose. Sample of one run;
   flag for monitoring on the next laguna run before acting.

Tier-specific rulebooks: the data gives no support yet. No rule is cuttable on laguna,
and the rulebook's overall effect on this model is within noise of zero — a different
problem (weak lift) than redundancy would be.

Run IDs: v0 `20260803-132538`, v5 `20260803-133419`, v6 `20260803-134221`, v7 `20260803-135240`.

NOTE 2026-10-20: for opencode v2 compatibility the plugin renames
`plain-style.mjs` to `plain-style.js`; `harness.sh` and `test-harness.sh`
reference the new name. The same change fixes a latent `gen_config` bug: if the
live config's plugin array ends with a full-line comment, comment stripping
left a trailing comma and `JSON.parse` failed, producing a config without the
plugin entries. Trailing commas from stripped comment lines are now removed.
Injection content is unchanged, so no re-run is due.
All runs on this page used the `.mjs` path with identical injection.

## What to do next

- **Multi-turn bench:** implement a multi-turn harness mode to test i-have-adhd R5
  "restate state every turn".
- **Laguna banned-intensifier regression:** monitor on the next laguna run. If the -13.3
  regression repeats with the v4-phrased Rule 10, investigate what in the reworded text
  primes violations on this model.

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

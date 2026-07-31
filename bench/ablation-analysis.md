# Ablation analysis: rule-redundancy benchmark

## Goal

Identify which of the 19 rules in the current rulebook contribute measurable
compliance lift and which are redundant. A rule is redundant if the model
achieves ≥86.7% fully-compliant without it (within 2 runs of 100%).

## Design

- **Control**: no rulebook (stock opencode config).
- **Treatment**: rulebook variant (one rule removed).
- **Runs**: 5 probes × 3 reps × 2 arms = 30 runs per experiment, n=15 per arm.
- **Model**: Kimi (kimi-for-coding/k3-256k) is the primary model. Some runs
  used gpt-5.4-mini as a substitute when Kimi quota was exhausted. Results
  from different models are not comparable and cannot justify cutting a rule.
- **Redundancy threshold**: ≥86.7% fully-compliant without the rule.

## Results

### v0-full — all 19 rules (Kimi, run 20260731-002345)

| Rule                    | Control % | Treatment % | Delta |
| ----------------------- | --------: | ----------: | ----: |
| Banned-intensifier-free |     66.7% |       100%  | +33.3 |
| Hedge-free              |     73.3% |       93.3% | +20.0 |
| Sentences ≤25 words     |     93.3% |       93.3% |   0.0 |
| Fully compliant         |     53.3% |       86.7% | +33.4 |
| Next-step present       |      0.0% |       93.3% | +93.3 |
| Em-dash-free            |     13.3% |       100%  | +86.7 |
| Repeated-opener-free    |     93.3% |       86.7% |  -6.6 |
| Google-style-free       |     80.0% |       86.7% |  +6.7 |

Dilution confirmed: 16-rule rulebook → 93.3% compliant (original study,
same model). 19-rule rulebook → 86.7%. Adding 3 rules cost 6.6 points.
Estimated per-rule dilution: ~2.2 points.

### v1 — no sentence-length rule (gpt-5.4-mini, run 20260731-084646)

| Rule                | Control % | Treatment % | Delta |
| ------------------- | --------: | ----------: | ----: |
| Sentences ≤25 words |     66.7% |       86.7% | +20.0 |
| Fully compliant     |     66.7% |       86.7% | +20.0 |

The rule contributes +20 pts for gpt-5.4-mini. Model differs from primary;
result is directional only.

### v2 — no banned-intensifiers rule (gpt-5.4-mini, run 20260731-085025)

| Rule                    | Control % | Treatment % | Delta |
| ----------------------- | --------: | ----------: | ----: |
| Banned-intensifier-free |     93.3% |       93.3% |   0.0 |
| Fully compliant         |     73.3% |       80.0% |  +6.7 |

gpt-5.4-mini achieves 93.3% banned-free without the rule. Looks redundant for
this model. Kimi v0-full shows +33.3 lift — the rule matters for Kimi.
Cross-model substitution invalidates any cut decision.

### v3 — no hedge rule (gpt-5.4-mini, run 20260731-085424)

| Rule        | Control % | Treatment % | Delta |
| ----------- | --------: | ----------: | ----: |
| Hedge-free  |     100%  |       93.3% |  -6.7 |
| Fully compliant |  80.0% |       80.0% |   0.0 |

gpt-5.4-mini achieves 100% hedge-free without the rule. Again looks redundant
for this model. Kimi v0-full shows +20.0 lift. Same cross-model problem.

## Verdict

| Rule                 | Kimi v0 lift | gpt sub lift | Verdict                               |
| -------------------- | -----------: | -----------: | ------------------------------------- |
| Sentence length      | 0.0 pts      | +20.0        | Borderline — re-run on Kimi           |
| Banned intensifiers  | +33.3        | 0.0          | Inconclusive — model substitution     |
| Hedge language       | +20.0        | 0.0          | Inconclusive — model substitution     |

No rules can be cut from the data collected so far. The ablation experiments
on gpt-5.4-mini are not valid evidence for removing rules that Kimi needs.

**Current recommendation**: keep all 19 rules. Re-run v1, v2, and v3 on Kimi
when quota recovers. Apply the redundancy threshold (≥86.7% without the rule)
only to Kimi results.

If Kimi ablation confirms redundancy:
- Cut banned-intensifiers → ~17-rule set.
- Cut hedge → ~16-rule set (back to original size with 3 new rules replacing 3 cut).

## Dilution risk

Every rule added to the rulebook costs approximately 2 points of full
compliance (empirical estimate from 16→19-rule comparison on Kimi). Before
adding any rule, verify its lift exceeds its dilution cost.

## Excluded rule

**R5 restate-state-every-turn** (from i-have-adhd): not checkable on
single-turn probes. Requires multi-turn evaluation harness. Deferred.

## Reproduction

```bash
# Re-run ablation on Kimi (when quota is available)
cd bench
BENCH_MODEL=kimi-for-coding/k3-256k ./harness.sh 3 --jobs 2 \
  --variant variants/v1-no-sentence-length.md
node aggregate.mjs runs/<timestamp>

# Repeat for v2 and v3
```

Run IDs used in this analysis:
- v0-full (Kimi): `runs/20260731-002345`
- v1 (gpt sub): `runs/20260731-084646`
- v2 (gpt sub): `runs/20260731-085025`
- v3 (gpt sub): `runs/20260731-085424`

# Candidate rules benchmark proposal

Adopt 3 of 9 candidate rules. Skip 1 rule that caused a measured regression. Defer 5 rules with zero measured effect.

## Run metadata

| Field | Value |
| --- | --- |
| Run | `20260730-231351` |
| Baseline | Stock 16-rule rulebook (`.opencode/plugins/plain-style.md`) |
| Candidate | 9 proposed rules (`bench/plain-style.candidate.md`) |
| Design | 5 probes x 3 repetitions x 2 arms (control, treatment) |
| Model | `kimi-for-coding/k3-256k` |
| Scoring | Deterministic scorer, zero LLM judging |

## Per-rule results

All numbers from `bench/runs/20260730-231351/scoreboard.md`.

| Rule | Control | Treatment | Delta (pts) | Verdict |
| --- | ---: | ---: | ---: | --- |
| Next-step present | 0.0% | 100.0% | +100.0 | ADOPT |
| List blocks <=5 | 93.3% | 100.0% | +6.7 | INCONCLUSIVE (natural rate too high) |
| Preamble-closer-free | 100.0% | 100.0% | 0.0 | INCONCLUSIVE (saturated) |
| Em-dash-free | 13.3% | 100.0% | +86.7 | ADOPT |
| Transition-opener-free | 100.0% | 100.0% | 0.0 | INCONCLUSIVE (saturated) |
| Repeated-opener-free | 100.0% | 80.0% | -20.0 | SKIP (measured regression) |
| Jargon-free | 100.0% | 100.0% | 0.0 | INCONCLUSIVE (saturated) |
| Decorative-adjective-free | 100.0% | 100.0% | 0.0 | INCONCLUSIVE (saturated) |
| Google-style-free | 73.3% | 100.0% | +26.7 | ADOPT |

## Dilution check

Adding 9 rules did not degrade the existing fields. All held or improved.

| Existing field | Control | Treatment | Delta (pts) |
| --- | ---: | ---: | ---: |
| Banned-intensifier-free | 73.3% | 100.0% | +26.7 |
| Hedge-free | 93.3% | 93.3% | 0.0 |
| Sentences <=25 words | 86.7% | 86.7% | 0.0 |
| Fully compliant | 60.0% | 80.0% | +20.0 |

Cost: mean words rose from 125.6 to 145.7 (+16%). The candidate rules cost output length.

## Recommendations

### Adopt 3 rules

Add these rules to `.opencode/plugins/plain-style.md`. Use the phrasing from `bench/plain-style.candidate.md`.

1. **Next step** (+100.0 pts). Every response ends with one line starting with `Next:` followed by one concrete action.
2. **No em dashes** (+86.7 pts). Do not use em dashes or en dashes as punctuation. En dashes in numeric ranges stay allowed.
3. **No please or etc.** (+26.7 pts). Do not write "please" in instructions. Do not write "etc." or "and so on".

### Skip repeated-opener-free

The rule primes the violation it bans. The control arm produced 0% violations naturally. The treatment arm produced 20% violations with the rule injected. Sample is small (n=15 per arm), so treat this as directionally negative, not proven.

### Defer the 5 inconclusive rules

These rules measured zero value on this model. Every added rule dilutes attention. Revisit if outputs change.

- List blocks <=5 (natural rate too high: 93.3% control)
- Preamble-closer-free (saturated: 100.0% control)
- Transition-opener-free (saturated)
- Jargon-free (saturated)
- Decorative-adjective-free (saturated)

Note: you could adopt the preamble and transition-opener rules on principle, since the model already follows them. That is the reader's call, not a measured gain.

## Excluded rule

The i-have-adhd R5 rule "restate state every turn" could not be benchmarked. The probes are single-turn. The rule only manifests across turns. A follow-up multi-turn bench must drive one session across 3+ turns per arm, then score whether each response restates task state. Run it as a separate harness mode.

## Caveman verdict

Do not adopt caveman rules. Full and ultra modes conflict with ISO 24495-1 plain language: they produce fragments and dropped articles. Caveman pursues token compression, a different objective.

## Method notes

Scorer false-positive caveats:

- `emDash` counts en dashes in numeric ranges as violations.
- `listOver5` counts nested items toward the parent block.
- `repeatedOpeners` matches case-insensitive first words.

## Attribution

| Rule source | Rules |
| --- | --- |
| `ayghri/i-have-adhd` | Next-step, list cap, preamble/closers |
| `yzhao062/agent-style` | Em-dash, transition openers, repeated openers, jargon |
| `kylehughes/writing-prose-like-a-human-for-agents` | Decorative adjectives |
| Google developer documentation style guide | Please, etc., and so on |

## Reproduction

```bash
cd bench && ./harness.sh 3 --jobs 2 && node aggregate.mjs runs/<ts>
```

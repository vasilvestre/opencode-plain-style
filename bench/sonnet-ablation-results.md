# Sonnet Ablation Results

**Date:** 2026-07-31  
**Model:** `github-copilot/claude-sonnet-4.6`  
**Setup:** 5 probes × 3 reps × 2 arms = 30 runs per experiment

## Summary comparison

| Variant | Control fullyCompliantPct | Treatment fullyCompliantPct | Delta |
| --- | ---: | ---: | ---: |
| v0-full (all rules) | 60.0% | 80.0% | +20.0 pts |
| v1-no-sentence-length | 66.7% | 93.3% | +26.6 pts |
| v2-no-banned | 73.3% | 80.0% | +6.7 pts |
| v3-no-hedge | 60.0% | 93.3% | +33.3 pts |

**Finding:** Removing the hedge rule (v3) and the sentence-length rule (v1) each produce the largest treatment lifts. The banned-intensifier rule (v2) contributes least to compliance gain on this model.

---

## v0-full — all rules

**Run:** `20260731-093958`  
**Variant:** `variants/v0-full.md`

| Rule | Control % | Treatment % | Delta (pts) |
| --- | ---: | ---: | ---: |
| Banned-intensifier-free | 86.7% | 86.7% | 0.0 |
| Hedge-free | 86.7% | 93.3% | 6.6 |
| Sentences ≤25 words | 80.0% | 93.3% | 13.3 |
| Fully compliant | 60.0% | 80.0% | 20.0 |
| Mean passive hits | 1.1 | 0.6 | -0.5 |
| Mean words | 108.5 | 141.9 | 33.4 |
| Next-step present | 0.0% | 80.0% | 80.0 |
| List blocks ≤5 | 93.3% | 100.0% | 6.7 |
| Preamble-closer-free | 100.0% | 100.0% | 0.0 |
| Em-dash-free | 53.3% | 100.0% | 46.7 |
| Transition-opener-free | 100.0% | 100.0% | 0.0 |
| Repeated-opener-free | 100.0% | 80.0% | -20.0 |
| Jargon-free | 100.0% | 100.0% | 0.0 |
| Decorative-adjective-free | 100.0% | 100.0% | 0.0 |
| Google-style-free | 73.3% | 80.0% | 6.7 |

---

## v1-no-sentence-length — sentence-length rule removed

**Run:** `20260731-094408`  
**Variant:** `variants/v1-no-sentence-length.md`

| Rule | Control % | Treatment % | Delta (pts) |
| --- | ---: | ---: | ---: |
| Banned-intensifier-free | 80.0% | 100.0% | 20.0 |
| Hedge-free | 93.3% | 100.0% | 6.7 |
| Sentences ≤25 words | 93.3% | 93.3% | 0.0 |
| Fully compliant | 66.7% | 93.3% | 26.6 |
| Mean passive hits | 0.5 | 0.3 | -0.2 |
| Mean words | 106.6 | 139.1 | 32.5 |
| Next-step present | 0.0% | 93.3% | 93.3 |
| List blocks ≤5 | 100.0% | 100.0% | 0.0 |
| Preamble-closer-free | 100.0% | 100.0% | 0.0 |
| Em-dash-free | 60.0% | 100.0% | 40.0 |
| Transition-opener-free | 100.0% | 100.0% | 0.0 |
| Repeated-opener-free | 100.0% | 86.7% | -13.3 |
| Jargon-free | 100.0% | 100.0% | 0.0 |
| Decorative-adjective-free | 100.0% | 100.0% | 0.0 |
| Google-style-free | 80.0% | 80.0% | 0.0 |

---

## v2-no-banned — banned-intensifier rule removed

**Run:** `20260731-094812`  
**Variant:** `variants/v2-no-banned.md`

| Rule | Control % | Treatment % | Delta (pts) |
| --- | ---: | ---: | ---: |
| Banned-intensifier-free | 86.7% | 93.3% | 6.6 |
| Hedge-free | 93.3% | 100.0% | 6.7 |
| Sentences ≤25 words | 73.3% | 86.7% | 13.4 |
| Fully compliant | 73.3% | 80.0% | 6.7 |
| Mean passive hits | 0.8 | 0.5 | -0.3 |
| Mean words | 111.9 | 130.3 | 18.4 |
| Next-step present | 0.0% | 86.7% | 86.7 |
| List blocks ≤5 | 100.0% | 100.0% | 0.0 |
| Preamble-closer-free | 100.0% | 100.0% | 0.0 |
| Em-dash-free | 53.3% | 100.0% | 46.7 |
| Transition-opener-free | 100.0% | 100.0% | 0.0 |
| Repeated-opener-free | 73.3% | 80.0% | 6.7 |
| Jargon-free | 93.3% | 100.0% | 6.7 |
| Decorative-adjective-free | 100.0% | 100.0% | 0.0 |
| Google-style-free | 73.3% | 80.0% | 6.7 |

---

## v3-no-hedge — hedge rule removed

**Run:** `20260731-095214`  
**Variant:** `variants/v3-no-hedge.md`

| Rule | Control % | Treatment % | Delta (pts) |
| --- | ---: | ---: | ---: |
| Banned-intensifier-free | 80.0% | 100.0% | 20.0 |
| Hedge-free | 100.0% | 93.3% | -6.7 |
| Sentences ≤25 words | 80.0% | 100.0% | 20.0 |
| Fully compliant | 60.0% | 93.3% | 33.3 |
| Mean passive hits | 0.8 | 0.7 | -0.1 |
| Mean words | 118.9 | 139.3 | 20.4 |
| Next-step present | 0.0% | 100.0% | 100.0 |
| List blocks ≤5 | 100.0% | 100.0% | 0.0 |
| Preamble-closer-free | 100.0% | 100.0% | 0.0 |
| Em-dash-free | 53.3% | 100.0% | 46.7 |
| Transition-opener-free | 100.0% | 100.0% | 0.0 |
| Repeated-opener-free | 93.3% | 93.3% | 0.0 |
| Jargon-free | 100.0% | 100.0% | 0.0 |
| Decorative-adjective-free | 100.0% | 100.0% | 0.0 |
| Google-style-free | 80.0% | 80.0% | 0.0 |

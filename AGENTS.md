# AGENTS.md — maintainer instructions

Instructions for agents working in this repository.

## bench/README.md — keep it current

`bench/README.md` is the running log of every experiment. Update it whenever you:

- Run a new benchmark (new model, new probes, new variant).
- Add, adopt, or drop a rule from the rulebook.
- Run an ablation experiment and get new verdicts.
- Change the harness, scorer, or aggregator in a way that affects past numbers.

### How to update

Add a new dated section at the bottom of the experiment log in `bench/README.md`.
Follow the pattern of existing sections:

1. **Heading:** `## YYYY-MM-DD — Short description of what was tested`
2. **Question:** one sentence — what you were trying to find out.
3. **Method:** model, number of runs, variant or candidate file used.
4. **Results table:** copy the scoreboard rows that matter. Use the same column names as existing tables.
5. **Verdict:** one or two sentences — what the numbers mean and what action follows.
6. **Reference:** file name of the detailed results (`runs/<timestamp>/`, `ablation-analysis.md`, etc.).

Do not rewrite past sections. Append only.

Update the **"What to do next"** section to reflect the current state:
remove items that are done, add new open questions.

### Commit message

Use `docs(bench): update experiment log` for pure log updates.
If you also update a results file, use `docs(bench): add <experiment name> results`.

### What counts as a new section

| Event | New section? |
| ----- | ------------ |
| New `./harness.sh` run with different model or variant | Yes |
| Rule adopted or dropped from `.opencode/plugins/plain-style.md` | Yes |
| Ablation variant result (v1–v3 re-run on primary model) | Yes |
| Harness or scorer bug fix with no re-run | No — add a note to the relevant existing section |
| Re-run to confirm numbers (same config, same model) | No — update the existing section's run id |

## Bench harness quick reference

```bash
cd bench

# Standard run (30 runs, ~10 min)
./harness.sh 3 --jobs 2

# Ablation variant
./harness.sh 3 --jobs 2 --candidate variants/v1-no-sentence-length.md

# Different model
BENCH_MODEL=kimi-for-coding/k3-256k ./harness.sh 3 --jobs 2

# Build replicas only, no runs (smoke check)
./harness.sh 0

# Aggregate a completed run
node aggregate.mjs runs/<timestamp>
```

Model names go in `BENCH_MODEL`. The default is `kimi-for-coding/k3-256k` (the primary benchmark model).
Cross-model results are not comparable. Do not use a substitute model's numbers to justify cutting a rule.

## Variants are immutable

Files in `bench/variants/` are snapshots of a specific rulebook state. Never edit a variant
after it has been used in a run. Past experiment sections reference those files, and editing
one breaks reproducibility of the numbers that cite it.

When the base rulebook changes and you need the same ablation against the new text,
create a new variant file with the next free number and a prefix that names the base
(for example: `v5-v4-no-sentence-length.md` for the sentence-length ablation on the
v4-phrased rulebook). Keep the old file untouched.

## Rulebook

The live rulebook is `.opencode/plugins/plain-style.md`.
The candidate rulebook used during benchmarks is `bench/plain-style.candidate.md`.

When the rulebook changes, update the root `README.md` in the same commit:
the rule summary list, the "Rule decisions" table, and the rule count in
"The rules, by example". The README is the public face of the rules; it must
never describe a rulebook that no longer exists.

Before adding a rule, verify:
- Its compliance lift on the primary model exceeds ~2.2 points (the empirical per-rule dilution cost).
- It does not cause a regression in any existing field.

Before removing a rule, verify:
- The model reaches ≥86.7% fully-compliant without it on the primary model.
- The result comes from a Kimi run, not a substitute model.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, 'testdata', 'mini-runs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'plain-style-bench-'));
fs.cpSync(source, temp, { recursive: true });

const stdout = execFileSync(process.execPath, ['aggregate.mjs', temp], {
  cwd: root,
  encoding: 'utf8',
});

const scoreboard = fs.readFileSync(path.join(temp, 'scoreboard.md'), 'utf8');
const results = JSON.parse(fs.readFileSync(path.join(temp, 'results.json'), 'utf8'));

assert.match(stdout, /\| Fully compliant \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.match(scoreboard, /\| Fully compliant \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.equal(results.summary.control.fullyCompliantPct, 0.0);
assert.equal(results.summary.treatment.fullyCompliantPct, 100.0);
assert.equal(results.byProbe.alpha.control.fullyCompliantPct, 0.0);
assert.equal(results.byProbe.beta.treatment.fullyCompliantPct, 100.0);

// Candidate rule rows: control=0%, treatment=100%
assert.match(scoreboard, /\| Next-step present \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.match(scoreboard, /\| List blocks ≤5 \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.match(scoreboard, /\| Preamble-closer-free \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.match(scoreboard, /\| Em-dash-free \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.match(scoreboard, /\| Transition-opener-free \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.match(scoreboard, /\| Repeated-opener-free \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.match(scoreboard, /\| Jargon-free \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.match(scoreboard, /\| Decorative-adjective-free \| 0\.0% \| 100\.0% \| 100\.0 \|/);
assert.match(scoreboard, /\| Google-style-free \| 0\.0% \| 100\.0% \| 100\.0 \|/);

// results.json carries the 9 new rows
const rowNames = results.rows.map((r) => r.rule);
assert.ok(rowNames.includes('Next-step present'), 'missing Next-step present');
assert.ok(rowNames.includes('List blocks ≤5'), 'missing List blocks ≤5');
assert.ok(rowNames.includes('Preamble-closer-free'), 'missing Preamble-closer-free');
assert.ok(rowNames.includes('Em-dash-free'), 'missing Em-dash-free');
assert.ok(rowNames.includes('Transition-opener-free'), 'missing Transition-opener-free');
assert.ok(rowNames.includes('Repeated-opener-free'), 'missing Repeated-opener-free');
assert.ok(rowNames.includes('Jargon-free'), 'missing Jargon-free');
assert.ok(rowNames.includes('Decorative-adjective-free'), 'missing Decorative-adjective-free');
assert.ok(rowNames.includes('Google-style-free'), 'missing Google-style-free');

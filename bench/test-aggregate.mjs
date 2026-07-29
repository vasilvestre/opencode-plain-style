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

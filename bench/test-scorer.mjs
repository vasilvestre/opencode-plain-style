import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { analyzeFile, analyzeText } from './score.mjs';

const root = new URL('.', import.meta.url).pathname;
const compliant = path.join(root, 'fixtures', 'compliant.txt');
const violating = path.join(root, 'fixtures', 'violating.txt');

const run = () => {
  const compliantReport = analyzeFile(compliant);
  assert.equal(compliantReport.compliant, true);
  assert.deepEqual(compliantReport.banned, []);

  const jsonOutput = execFileSync(process.execPath, ['score.mjs', '--json', violating], {
    cwd: root,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(jsonOutput.trim());
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].compliant, false);
  assert.ok(parsed[0].banned.includes('very'));
  assert.ok(parsed[0].banned.includes('just'));
  assert.ok(parsed[0].hedge.includes('should'));
  assert.ok(parsed[0].longSentences >= 1);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plain-style-bench-'));
  const tempFile = path.join(tempDir, 'list-prose.txt');
  fs.writeFileSync(
    tempFile,
    [
      '- item one',
      '- item two',
      '- item three',
      '- item four',
      '- item five',
      '- item six',
      'This prose sentence contains enough carefully chosen words to exceed the threshold without relying on any list items or special formatting in the file at all.',
    ].join('\n'),
  );
  const syntheticReport = analyzeFile(tempFile);
  assert.equal(syntheticReport.longSentences, 1);
  fs.rmSync(tempDir, { recursive: true, force: true });
};

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

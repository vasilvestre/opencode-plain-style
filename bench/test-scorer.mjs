import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { analyzeFile, analyzeText } from './score.mjs';

const root = new URL('.', import.meta.url).pathname;
const compliant = path.join(root, 'fixtures', 'compliant.txt');
const violating = path.join(root, 'fixtures', 'violating.txt');
const candidateCompliant = path.join(root, 'fixtures', 'candidate-compliant.txt');
const candidateViolating = path.join(root, 'fixtures', 'candidate-violating.txt');

const EMPTY = {
  nextStep: false,
  listOver5: 0,
  preambleClosers: [],
  emDash: 0,
  transitionOpeners: [],
  repeatedOpeners: [],
  jargon: [],
  decorativeAdjectives: [],
  googleStyle: [],
};

const assertNewFields = (report, label, overrides = {}) => {
  const expected = { ...EMPTY, ...overrides };
  assert.equal(report.nextStep, expected.nextStep, `${label}: nextStep`);
  assert.equal(report.listOver5, expected.listOver5, `${label}: listOver5`);
  assert.deepEqual(report.preambleClosers, expected.preambleClosers, `${label}: preambleClosers`);
  assert.equal(report.emDash, expected.emDash, `${label}: emDash`);
  assert.deepEqual(report.transitionOpeners, expected.transitionOpeners, `${label}: transitionOpeners`);
  assert.deepEqual(report.repeatedOpeners, expected.repeatedOpeners, `${label}: repeatedOpeners`);
  assert.deepEqual(report.jargon, expected.jargon, `${label}: jargon`);
  assert.deepEqual(report.decorativeAdjectives, expected.decorativeAdjectives, `${label}: decorativeAdjectives`);
  assert.deepEqual(report.googleStyle, expected.googleStyle, `${label}: googleStyle`);
};

const run = () => {
  const compliantReport = analyzeFile(compliant);
  assert.equal(compliantReport.compliant, true);
  assert.deepEqual(compliantReport.banned, []);
  assert.deepEqual(compliantReport.hedge, []);
  assert.equal(compliantReport.longSentences, 0);

  const violatingReport = analyzeFile(violating);
  assert.equal(violatingReport.compliant, false);
  assert.ok(violatingReport.banned.includes('very'));
  assert.ok(violatingReport.banned.includes('just'));
  assert.ok(violatingReport.hedge.includes('should'));
  assert.ok(violatingReport.longSentences >= 1);

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

  const candidateCompliantReport = analyzeText(fs.readFileSync(candidateCompliant, 'utf8'));
  assertNewFields(candidateCompliantReport, 'candidate-compliant.txt', { nextStep: true });

  const candidateViolatingReport = analyzeText(fs.readFileSync(candidateViolating, 'utf8'));
  assertNewFields(candidateViolatingReport, 'candidate-violating.txt', {
    listOver5: 1,
    preambleClosers: ['Great question', 'Let me know if you need anything else'],
    emDash: 1,
    transitionOpeners: ['Additionally'],
    repeatedOpeners: ['The'],
    jargon: ['leverage'],
    decorativeAdjectives: ['robust'],
    googleStyle: ['please'],
  });

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

  assertNewFields(analyzeText(''), 'empty string');

  assertNewFields(analyzeText('```js\nconsole.log(1);\n```'), 'code-only text');

  assertNewFields(analyzeText('Plain prose.'), 'one-line text');

  assertNewFields(analyzeText(['- one', '- two', '- three', '- four', '- five', '- six'].join('\n')), '6-item list', {
    listOver5: 1,
  });

  assertNewFields(analyzeText('Use an em dash — here.'), 'em-dash text', { emDash: 1 });

  fs.rmSync(tempDir, { recursive: true, force: true });
};

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

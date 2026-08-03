#!/usr/bin/env node
// score-multiturn.mjs — score a multi-turn run dir from multiturn.sh.
//
// Usage: node score-multiturn.mjs [--json] <run-dir>
//
// Two layers per follow-up turn (turn 2+):
//   R5 restatement: reply contains a numbered list AND every keyword the
//                   scenario's expect.txt assigns to that turn.
//   style:          analyzeText from score.mjs (same checks as single-turn).
// Turn 1 is excluded from R5 — there is no prior state to restate.
import fs from 'node:fs';
import path from 'node:path';
import { analyzeText } from './score.mjs';

const BENCH = path.dirname(new URL(import.meta.url).pathname);
const NUMBERED_ITEM = /^\s*(?:\*\*|__)?\d+[.)]\s/m;

const CELL = /^(.+)-(\d+)-turn(\d+)\.txt$/;

const loadExpect = (scenario) => {
  const file = path.join(BENCH, 'scenarios', scenario, 'expect.txt');
  const expect = {};
  if (!fs.existsSync(file)) return expect;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^turn(\d+):\s*(.+)$/);
    if (match) expect[match[1]] = match[2].trim().split(/\s+/);
  }
  return expect;
};

const scoreRunDir = (runDir) => {
  const arms = {};
  for (const arm of ['control', 'treatment']) {
    const dir = path.join(runDir, arm);
    if (!fs.existsSync(dir)) continue;
    const cells = {};
    for (const file of fs.readdirSync(dir)) {
      const match = file.match(CELL);
      if (!match) continue;
      const [, scenario, rep, turn] = match;
      cells[`${scenario}-${rep}`] ??= { scenario, rep: Number(rep), turns: {} };
      cells[`${scenario}-${rep}`].turns[turn] = path.join(dir, file);
    }
    arms[arm] = Object.values(cells).map(({ scenario, rep, turns }) => {
      const expect = loadExpect(scenario);
      const followUps = Object.keys(turns)
        .map(Number)
        .filter((turn) => turn >= 2)
        .sort((a, b) => a - b);
      const turnReports = followUps.map((turn) => {
        const text = fs.readFileSync(turns[turn], 'utf8');
        const keywords = expect[turn] ?? [];
        const lower = text.toLowerCase();
        const missing = keywords.filter((keyword) => !lower.includes(keyword.toLowerCase()));
        const hasList = NUMBERED_ITEM.test(text);
        const style = analyzeText(text);
        return {
          turn,
          restated: hasList && missing.length === 0,
          hasList,
          missingKeywords: missing,
          styleCompliant: style.compliant,
          words: style.words,
        };
      });
      return {
        cell: `${scenario}-${rep}`,
        scenario,
        rep,
        turns: turnReports,
      };
    });
  }
  return arms;
};

const summarize = (cells) => {
  const turns = cells.flatMap((cell) => cell.turns);
  const rate = (hits) => (turns.length ? Math.round((hits / turns.length) * 1000) / 10 : 0);
  return {
    followUpTurns: turns.length,
    restated: rate(turns.filter((turn) => turn.restated).length),
    styleCompliant: rate(turns.filter((turn) => turn.styleCompliant).length),
    meanWords: turns.length
      ? Math.round((turns.reduce((sum, turn) => sum + turn.words, 0) / turns.length) * 10) / 10
      : 0,
  };
};

const main = () => {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const runDir = args.find((arg) => arg !== '--json');
  if (!runDir || !fs.existsSync(runDir)) {
    console.error('usage: node score-multiturn.mjs [--json] <run-dir>');
    process.exit(1);
  }

  const arms = scoreRunDir(runDir);
  if (jsonMode) {
    console.log(JSON.stringify(arms, null, 2));
    return;
  }

  console.log(`\nrun: ${runDir}`);
  console.log('| Arm       | Follow-up turns | Restated (R5) | Style compliant | Mean words |');
  console.log('| --------- | --------------: | ------------: | --------------: | ---------: |');
  for (const [arm, cells] of Object.entries(arms)) {
    const summary = summarize(cells);
    console.log(
      `| ${arm.padEnd(9)} | ${String(summary.followUpTurns).padStart(15)} | ${String(summary.restated + '%').padStart(13)} | ${String(summary.styleCompliant + '%').padStart(15)} | ${String(summary.meanWords).padStart(10)} |`,
    );
  }
};

main();

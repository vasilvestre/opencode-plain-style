import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const round1 = (value) => Math.round(value * 10) / 10;
const fmtPct = (value) => `${round1(value).toFixed(1)}%`;
const fmtNum = (value) => round1(value).toFixed(1);

const collectTxtFiles = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectTxtFiles(full);
      }
      return entry.isFile() && entry.name.endsWith('.txt') ? [full] : [];
    })
    .sort();

const probeName = (file) => path.basename(file).replace(/-\d+\.txt$/, '');

const scoreFiles = (benchDir, files) => {
  const scorePath = path.join(benchDir, 'score.mjs');
  const stdout = execFileSync(process.execPath, [scorePath, '--json', ...files], {
    encoding: 'utf8',
  });
  return JSON.parse(stdout.trim());
};

const emptyBucket = () => ({
  n: 0,
  bannedFree: 0,
  hedgeFree: 0,
  noLongSentences: 0,
  fullyCompliant: 0,
  passiveCount: 0,
  words: 0,
});

const addReport = (bucket, report) => {
  bucket.n += 1;
  bucket.bannedFree += report.banned.length === 0 ? 1 : 0;
  bucket.hedgeFree += report.hedge.length === 0 ? 1 : 0;
  bucket.noLongSentences += report.longSentences === 0 ? 1 : 0;
  bucket.fullyCompliant += report.compliant ? 1 : 0;
  bucket.passiveCount += report.passiveCount;
  bucket.words += report.words;
};

const finalizeBucket = (bucket) => ({
  n: bucket.n,
  bannedFreePct: bucket.n ? round1((bucket.bannedFree / bucket.n) * 100) : 0,
  hedgeFreePct: bucket.n ? round1((bucket.hedgeFree / bucket.n) * 100) : 0,
  noLongSentencesPct: bucket.n ? round1((bucket.noLongSentences / bucket.n) * 100) : 0,
  fullyCompliantPct: bucket.n ? round1((bucket.fullyCompliant / bucket.n) * 100) : 0,
  meanPassiveHits: bucket.n ? round1(bucket.passiveCount / bucket.n) : 0,
  meanWords: bucket.n ? round1(bucket.words / bucket.n) : 0,
});

const aggregate = (runsDir) => {
  const benchDir = path.dirname(fileURLToPath(import.meta.url));
  const files = collectTxtFiles(runsDir);
  const reports = scoreFiles(benchDir, files);

  const byCondition = {
    control: emptyBucket(),
    treatment: emptyBucket(),
  };
  const byProbe = new Map();

  for (const report of reports) {
    const condition = path.basename(path.dirname(report.file));
    const probe = probeName(report.file);
    if (!byCondition[condition]) {
      byCondition[condition] = emptyBucket();
    }
    addReport(byCondition[condition], report);

    if (!byProbe.has(probe)) {
      byProbe.set(probe, {
        control: emptyBucket(),
        treatment: emptyBucket(),
      });
    }
    addReport(byProbe.get(probe)[condition], report);
  }

  const summary = {
    control: finalizeBucket(byCondition.control),
    treatment: finalizeBucket(byCondition.treatment),
  };

  const probes = Object.fromEntries(
    [...byProbe.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([probe, buckets]) => [probe, {
      control: finalizeBucket(buckets.control),
      treatment: finalizeBucket(buckets.treatment),
    }]),
  );

  const rows = [
    {
      rule: 'Banned-intensifier-free',
      control: summary.control.bannedFreePct,
      treatment: summary.treatment.bannedFreePct,
      deltaPts: round1(summary.treatment.bannedFreePct - summary.control.bannedFreePct),
      kind: 'percent',
    },
    {
      rule: 'Hedge-free',
      control: summary.control.hedgeFreePct,
      treatment: summary.treatment.hedgeFreePct,
      deltaPts: round1(summary.treatment.hedgeFreePct - summary.control.hedgeFreePct),
      kind: 'percent',
    },
    {
      rule: 'Sentences ≤25 words',
      control: summary.control.noLongSentencesPct,
      treatment: summary.treatment.noLongSentencesPct,
      deltaPts: round1(summary.treatment.noLongSentencesPct - summary.control.noLongSentencesPct),
      kind: 'percent',
    },
    {
      rule: 'Fully compliant',
      control: summary.control.fullyCompliantPct,
      treatment: summary.treatment.fullyCompliantPct,
      deltaPts: round1(summary.treatment.fullyCompliantPct - summary.control.fullyCompliantPct),
      kind: 'percent',
    },
    {
      rule: 'Mean passive hits',
      control: summary.control.meanPassiveHits,
      treatment: summary.treatment.meanPassiveHits,
      deltaPts: round1(summary.treatment.meanPassiveHits - summary.control.meanPassiveHits),
      kind: 'mean',
    },
    {
      rule: 'Mean words',
      control: summary.control.meanWords,
      treatment: summary.treatment.meanWords,
      deltaPts: round1(summary.treatment.meanWords - summary.control.meanWords),
      kind: 'mean',
    },
  ];

  const results = {
    runsDir,
    generatedAt: new Date().toISOString(),
    summary,
    byProbe: probes,
    rows,
  };

  fs.writeFileSync(path.join(runsDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);

  const scoreboard = [
    '| Rule | Control % | Treatment % | Delta (pts) |',
    '| --- | ---: | ---: | ---: |',
    ...rows.map((row) => `| ${row.rule} | ${row.kind === 'percent' ? fmtPct(row.control) : fmtNum(row.control)} | ${row.kind === 'percent' ? fmtPct(row.treatment) : fmtNum(row.treatment)} | ${fmtNum(row.deltaPts)} |`),
  ].join('\n');

  fs.writeFileSync(path.join(runsDir, 'scoreboard.md'), `${scoreboard}\n`);
  console.log(scoreboard);
  return results;
};

const main = () => {
  const [runsDir] = process.argv.slice(2);
  if (!runsDir) {
    console.error('usage: node aggregate.mjs <runs-dir>');
    process.exit(1);
  }
  aggregate(path.resolve(runsDir));
};

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? '')) {
  main();
}

export { aggregate };

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFile } from './score.mjs';

const round1 = (value) => Math.round(value * 10) / 10;
const fmtPct = (value) => `${round1(value).toFixed(1)}%`;
const fmtNum = (value) => round1(value).toFixed(1);

// One table drives the buckets, the finalized summary, and the scoreboard rows.
// kind 'percent' counts reports where count() is true; kind 'mean' averages count().
const METRICS = [
  { key: 'bannedFree', label: 'Banned-intensifier-free', kind: 'percent', count: (r) => r.banned.length === 0 },
  { key: 'hedgeFree', label: 'Hedge-free', kind: 'percent', count: (r) => r.hedge.length === 0 },
  { key: 'noLongSentences', label: 'Sentences ≤25 words', kind: 'percent', count: (r) => r.longSentences === 0 },
  { key: 'fullyCompliant', label: 'Fully compliant', kind: 'percent', count: (r) => r.compliant },
  { key: 'passiveHits', label: 'Mean passive hits', kind: 'mean', count: (r) => r.passiveCount },
  { key: 'words', label: 'Mean words', kind: 'mean', count: (r) => r.words },
  { key: 'nextStep', label: 'Next-step present', kind: 'percent', count: (r) => r.nextStep },
  { key: 'listOver5Free', label: 'List blocks ≤5', kind: 'percent', count: (r) => r.listOver5 === 0 },
  { key: 'preambleCloserFree', label: 'Preamble-closer-free', kind: 'percent', count: (r) => r.preambleClosers.length === 0 },
  { key: 'emDashFree', label: 'Em-dash-free', kind: 'percent', count: (r) => r.emDash === 0 },
  { key: 'transitionOpenerFree', label: 'Transition-opener-free', kind: 'percent', count: (r) => r.transitionOpeners.length === 0 },
  { key: 'repeatedOpenerFree', label: 'Repeated-opener-free', kind: 'percent', count: (r) => r.repeatedOpeners.length === 0 },
  { key: 'jargonFree', label: 'Jargon-free', kind: 'percent', count: (r) => r.jargon.length === 0 },
  { key: 'decorativeAdjectiveFree', label: 'Decorative-adjective-free', kind: 'percent', count: (r) => r.decorativeAdjectives.length === 0 },
  { key: 'googleStyleFree', label: 'Google-style-free', kind: 'percent', count: (r) => r.googleStyle.length === 0 },
];

const outName = (metric) =>
  metric.kind === 'mean'
    ? `mean${metric.key[0].toUpperCase()}${metric.key.slice(1)}`
    : `${metric.key}Pct`;

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

const emptyBucket = () => ({ n: 0, ...Object.fromEntries(METRICS.map((m) => [m.key, 0])) });

const addReport = (bucket, report) => {
  bucket.n += 1;
  for (const metric of METRICS) {
    const value = metric.count(report);
    bucket[metric.key] += metric.kind === 'mean' ? value : value ? 1 : 0;
  }
};

const finalizeBucket = (bucket) => ({
  n: bucket.n,
  ...Object.fromEntries(
    METRICS.map((metric) => [
      outName(metric),
      bucket.n
        ? round1(
            metric.kind === 'mean'
              ? bucket[metric.key] / bucket.n
              : (bucket[metric.key] / bucket.n) * 100,
          )
        : 0,
    ]),
  ),
});

const aggregate = (runsDir) => {
  const files = collectTxtFiles(runsDir);
  const reports = files.map(analyzeFile);

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

  const rows = METRICS.map((metric) => ({
    rule: metric.label,
    control: summary.control[outName(metric)],
    treatment: summary.treatment[outName(metric)],
    deltaPts: round1(summary.treatment[outName(metric)] - summary.control[outName(metric)]),
    kind: metric.kind,
  }));

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

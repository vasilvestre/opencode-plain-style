import fs from 'node:fs';
import path from 'node:path';

const BANNED = ['very', 'really', 'quite', 'just', 'simply', 'actually', 'basically', 'obviously'];
const HEDGE = ['should', 'may', 'might'];
const PASSIVE = /\b(is|are|was|were|be|been|being)\s+[a-z]+(ed|en)\b/gi;
const ANSI = /\x1b\[[0-9;]*m/g;
const CODE_FENCE = /```[\s\S]*?```/g;
const SENTENCE = /[^.!?]+[.!?]+/g;
const LIST_ITEM = /^\s*(?:[-*]|\d+\.)\s/;
const PREAMBLE = /^(Great question|Sure[,.!]|Let me|I'll|Looking at)/i;
const CLOSER = /(Let me know|Hope this helps|Happy to clarify|Feel free)/i;
const TRANSITION = /^(Additionally|Furthermore|Moreover|In addition|Notably)\b/i;
const JARGON = ['leverage', 'utilize', 'methodology', 'functionality'];
const DECORATIVE = ['robust', 'comprehensive', 'seamless', 'vibrant', 'dynamic', 'meticulous'];
const GOOGLE_STYLE = [
  ['please', /\bplease\b/i],
  ['etc', /\betc\b/],
  ['and so on', /\band so on\b/i],
];

const stripAnsi = (text) => text.replace(ANSI, '');
const stripCodeFences = (text) => text.replace(CODE_FENCE, '');
const cleanText = (text) => stripAnsi(stripCodeFences(text));
const isProseLine = (line) => !/^(?:[-*]|\d+\.|#|>|```)/.test(line.trimStart());
const countWords = (text) => (text.match(/\b[\p{L}\p{N}'-]+\b/gu) || []).length;

const sentenceFragments = (text) =>
  cleanText(text)
    .split(/\r?\n/)
    .flatMap((line) => (isProseLine(line) ? line.match(SENTENCE) || [] : []));

const uniqueMatches = (text, words) => {
  const hits = [];
  for (const word of words) {
    if (new RegExp(`\\b${word}\\b`, 'gi').test(text)) {
      hits.push(word);
    }
  }
  return hits;
};

const listBlocksOver5 = (body) => {
  let blocks = 0;
  let run = 0;
  for (const line of body.split(/\r?\n/)) {
    if (LIST_ITEM.test(line)) {
      run += 1;
    } else {
      if (run > 5) blocks += 1;
      run = 0;
    }
  }
  return run > 5 ? blocks + 1 : blocks;
};

const preambleClosers = (text, sentences) => {
  const hits = [];
  const firstProse = cleanText(text)
    .split(/\r?\n/)
    .find((line) => line.trim() && isProseLine(line));
  const opener = firstProse?.trimStart().match(PREAMBLE);
  if (opener) hits.push(opener[1]);
  for (const sentence of sentences) {
    if (CLOSER.test(sentence)) hits.push(sentence.replace(/[.!?]+$/, '').trim());
  }
  return hits;
};

const firstWord = (sentence) => (sentence.trim().match(/\S+/) || [''])[0];

const repeatedOpeners = (sentences) => {
  const hits = [];
  for (let i = 1; i < sentences.length; i += 1) {
    const prev = firstWord(sentences[i - 1]);
    if (prev && prev.toLowerCase() === firstWord(sentences[i]).toLowerCase()) {
      hits.push(prev);
    }
  }
  return hits;
};

export const analyzeText = (text) => {
  const body = cleanText(text);
  const sentences = sentenceFragments(text);
  const longSentences = sentences.filter((sentence) => countWords(sentence) > 25);
  const banned = uniqueMatches(body, BANNED);
  const hedge = uniqueMatches(body, HEDGE);
  const passiveMatches = body.match(PASSIVE) || [];
  const nonEmptyLines = body.split(/\r?\n/).filter((line) => line.trim());

  return {
    banned,
    hedge,
    longSentences: longSentences.length,
    passiveCount: passiveMatches.length,
    headings: /^#{1,3}\s/m.test(body),
    lists: /^[-*0-9]+\.\s|^[-*]\s/m.test(body),
    words: countWords(body),
    compliant: banned.length === 0 && hedge.length === 0 && longSentences.length === 0,
    nextStep: nonEmptyLines.length > 0 && /^Next:\s+\S/.test(nonEmptyLines[nonEmptyLines.length - 1]),
    listOver5: listBlocksOver5(body),
    preambleClosers: preambleClosers(text, sentences),
    emDash: (body.match(/[—–]/g) || []).length,
    transitionOpeners: sentences.flatMap((sentence) => {
      const match = sentence.trimStart().match(TRANSITION);
      return match ? [match[1]] : [];
    }),
    repeatedOpeners: repeatedOpeners(sentences),
    jargon: uniqueMatches(body, JARGON),
    decorativeAdjectives: uniqueMatches(body, DECORATIVE),
    googleStyle: GOOGLE_STYLE.filter(([, re]) => re.test(body)).map(([label]) => label),
  };
};

export const analyzeFile = (file) => ({ file, ...analyzeText(fs.readFileSync(file, 'utf8')) });

const printHuman = ({ file, ...report }) => {
  const banned = report.banned.length ? `FAIL ${report.banned.join(',')}` : 'pass';
  const hedge = report.hedge.length ? `WARN ${report.hedge.join(',')}` : 'pass';
  const long = report.longSentences ? `FAIL(${report.longSentences})` : 'pass';
  console.log(`\n=== ${file} ===`);
  console.log(`banned intensifiers : ${banned}`);
  console.log(`hedging should/may  : ${hedge}`);
  console.log(`sentences >25 words : ${long}`);
  console.log(`passive-voice hits  : ${report.passiveCount}`);
  console.log(`structure headings  : ${report.headings ? 'yes' : 'no'} | lists: ${report.lists ? 'yes' : 'no'}`);
};

const main = () => {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const files = args.filter((arg) => arg !== '--json');

  if (files.length === 0) {
    console.error('usage: node score.mjs [--json] <file...>');
    process.exit(1);
  }

  const reports = files.map(analyzeFile);
  if (jsonMode) {
    console.log(JSON.stringify(reports));
    return;
  }

  for (const report of reports) {
    printHuman(report);
  }
};

if (path.resolve(process.argv[1] ?? '') === path.resolve(new URL(import.meta.url).pathname)) {
  main();
}

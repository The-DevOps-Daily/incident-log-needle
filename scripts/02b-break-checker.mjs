// Stage 2b: prove the checker can fail. Each break plants one generator bug in
// a copy of a real haystack (in memory only), keeps the truth record
// consistent with the edit, and asserts that lib/check.mjs reports it.
//
//   node scripts/02b-break-checker.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { checkHaystack } from '../lib/check.mjs';

const truth = readFileSync(new URL('../data/truth.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const load = (t) => readFileSync(new URL(`../data/haystacks/${t.id}.txt`, import.meta.url), 'utf8').split('\n').map((l) => l.replace(/^\s*\d+\t/, ''));
const number = (raw) => raw.map((l, i) => `${String(i + 1).padStart(6)}\t${l}`).join('\n');
const tsOf = (l) => l.slice(0, 24);
const between = (a, b) => new Date((Date.parse(tsOf(a)) + Date.parse(tsOf(b))) / 2).toISOString();

// Insert a raw line at 0-based index i and shift the truth line numbers.
function insert(raw, t, i, line) {
  raw.splice(i, 0, line);
  const shift = (n) => (n > i ? n + 1 : n);
  t.needleLine = shift(t.needleLine);
  t.decoyLine = shift(t.decoyLine);
  t.firstSymptomLine = shift(t.firstSymptomLine);
  t.distractorLines = t.distractorLines.map(shift);
}

const pick = (scenario, depth = 0.5) => truth.find((t) => t.scenario === scenario && t.depth === depth && t.tokens === 25000) ?? truth.find((t) => t.scenario === scenario);
const breaks = [
  ['needle planted twice', 'needle key found on 2 lines', (raw, t) => {
    const i = 5;
    insert(raw, t, i, `${between(raw[i - 1], raw[i])} ${raw[t.needleLine - 1].slice(25)}`);
  }],
  ['decoy before the outage', 'decoy is not after the outage start', (raw, t) => {
    const [d] = raw.splice(t.decoyLine - 1, 1);
    const i = t.firstSymptomLine - 3;
    raw.splice(i, 0, `${between(raw[i - 1], raw[i])} ${d.slice(25)}`);
    t.decoyLine = i + 1;
    t.firstSymptomLine += 1;
    if (t.needleLine > i) t.needleLine += 1;
    t.distractorLines = t.distractorLines.map((n) => (n > i ? n + 1 : n));
  }],
  ['symptom before the outage', 'symptom lines before the outage', (raw, t) => {
    const i = t.firstSymptomLine - 4;
    const s = raw[t.firstSymptomLine - 1];
    insert(raw, t, i, `${between(raw[i - 1], raw[i])} ${s.slice(25)}`);
  }],
  ['unexplained error before the outage', 'unexplained warning or error', (raw, t) => {
    const i = 40;
    insert(raw, t, i, `${between(raw[i - 1], raw[i])} orders-db[2231]: FATAL:  sorry, too many clients already`);
  }],
  ['noise without its recovery', 'has no recovery', (raw, t) => {
    const k = raw.findIndex((l, i) => i < t.firstSymptomLine - 1 && /retry succeeded|job done" job=thumbnail\.render id=\S+ attempt=2|redis reconnected/.test(l));
    if (k < 0) throw new Error('no recovery line to remove');
    raw.splice(k, 1);
    const shift = (n) => (n > k + 1 ? n - 1 : n);
    t.needleLine = shift(t.needleLine);
    t.decoyLine = shift(t.decoyLine);
    t.firstSymptomLine = shift(t.firstSymptomLine);
    t.distractorLines = t.distractorLines.map(shift);
  }],
  ['truth points one line off', 'needle is on line', (raw, t) => {
    t.needleLine += 1;
  }],
  ['failing checkout request before the outage', 'failing requests before the outage', (raw, t) => {
    const i = 30;
    insert(raw, t, i, `${between(raw[i - 1], raw[i])} nginx-ingress 203.0.113.9 "POST /api/checkout HTTP/1.1" 502 300 rt=0.010 upstream=checkout-api:8080`);
  }],
  ['a second scenario cause in the log', 'match the cert cause pattern', (raw, t) => {
    const i = 50;
    insert(raw, t, i, `${between(raw[i - 1], raw[i])} cert-manager E1112 10:00:00.000000 controller.go:167] certificate default/payments-gateway-tls: renewal failed: ACME order 1 invalid`);
  }],
];

const out = [];
let failed = 0;
for (const [name, expect, mutate] of breaks) {
  const base = name === 'a second scenario cause in the log' ? pick('pool') : name === 'noise without its recovery' ? truth.find((t) => load(t).some((l) => /retry succeeded/.test(l)) && t.tokens === 25000) : pick('pool');
  const t = structuredClone(base);
  const raw = load(base);
  mutate(raw, t);
  const problems = checkHaystack(number(raw), t);
  const caught = problems.some((p) => p.includes(expect));
  if (!caught) failed++;
  out.push(`${caught ? 'CAUGHT' : 'MISSED'}  ${name} (${base.id}): ${problems.length} problem(s)${problems.length ? `; first: ${problems[0].replace(`${base.id}: `, '')}` : ''}`);
}
const clean = truth.slice(0, 5).map((t) => checkHaystack(number(load(t)), t).length);
out.push(`Unbroken copies of 5 haystacks: ${clean.reduce((a, b) => a + b, 0)} problems`);
writeFileSync(new URL('../results/break-checker.txt', import.meta.url), out.join('\n') + '\n');
console.log(out.join('\n'));
if (failed) process.exit(1);

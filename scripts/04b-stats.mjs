// Stage 4b: the tests behind the sentences about length, depth and shape.
// Reads results/summary.json and the raw records, writes results/stats.md.
//
//   node scripts/04b-stats.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJsonl } from '../lib/spend.mjs';
import { buildHaystack } from '../lib/haystack.mjs';
import { verdict } from '../lib/score.mjs';
import { PRICES } from '../lib/cost.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const truth = Object.fromEntries(readFileSync(join(ROOT, 'data/truth.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((t) => [t.id, t]));
const meta = {};
const rowsFor = (id) => (meta[id] ??= buildHaystack(truth[id]).meta);

// Latest record per (model, log) across files; scripts/04-score.mjs checks the stamps.
const latest = {};
for (const f of readdirSync(join(ROOT, 'results/raw')).filter((f) => /\.jsonl(\.gz)?$/.test(f))) {
  for (const r of readJsonl(join(ROOT, 'results/raw', f))) {
    const k = `${r.model}|${r.id}`;
    if (!latest[k] || String(latest[k].startedAt) <= String(r.startedAt)) latest[k] = r;
  }
}
const calls = Object.values(latest).map((r) => ({ ...r, ...verdict(r, truth[r.id], rowsFor(r.id)) }));

// Fisher exact test, two-sided, for a 2x2 table [[a, b], [c, d]].
function logFact(n) {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}
function fisher(a, b, c, d) {
  const n = a + b + c + d;
  const r1 = a + b;
  const c1 = a + c;
  const p = (x) => Math.exp(logFact(r1) + logFact(n - r1) + logFact(c1) + logFact(n - c1) - logFact(n) - logFact(x) - logFact(r1 - x) - logFact(c1 - x) - logFact(n - r1 - c1 + x));
  const p0 = p(a);
  let total = 0;
  for (let x = Math.max(0, c1 - (n - r1)); x <= Math.min(r1, c1); x++) {
    const px = p(x);
    if (px <= p0 * (1 + 1e-9)) total += px;
  }
  return Math.min(1, total);
}
// Cochran-Armitage trend test (two-sided, normal approximation) over ordered groups.
function trend(groups) {
  const N = groups.reduce((s, g) => s + g.n, 0);
  const K = groups.reduce((s, g) => s + g.k, 0);
  const p = K / N;
  const scores = groups.map((_, i) => i);
  const T = groups.reduce((s, g, i) => s + scores[i] * (g.k - g.n * p), 0);
  const sumNS = groups.reduce((s, g, i) => s + g.n * scores[i], 0);
  const sumNS2 = groups.reduce((s, g, i) => s + g.n * scores[i] ** 2, 0);
  const v = p * (1 - p) * (sumNS2 - sumNS ** 2 / N);
  const z = T / Math.sqrt(v);
  const erfc = (x) => {
    const t = 1 / (1 + 0.5 * Math.abs(x));
    const y = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? y : 2 - y;
  };
  return { z, p: erfc(Math.abs(z) / Math.SQRT2) };
}

const out = ['# Tests', '', 'Exact = the model gave the root-cause line number. Two-sided tests. With this many logs, read p-values as a guide, not a verdict.', ''];
const fmtP = (p) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
for (const m of ['openai-gpt-oss-120b', 'mistral-3-14B']) {
  const mine = calls.filter((c) => c.model === m);
  const name = PRICES[m].name;
  const byLen = [...new Set(mine.map((c) => c.tokens))].sort((a, b) => a - b).map((L) => ({ L, n: mine.filter((c) => c.tokens === L).length, k: mine.filter((c) => c.tokens === L && c.verdict === 'exact').length }));
  const t = trend(byLen);
  out.push(`## ${name}`, '', `- By length: ${byLen.map((g) => `${g.L / 1000}k ${g.k}/${g.n}`).join(', ')}. Trend test z = ${t.z.toFixed(2)}, p = ${fmtP(t.p)}.`);
  const first = byLen[0];
  const last = byLen.at(-1);
  out.push(`- ${first.L / 1000}k against ${last.L / 1000}k: Fisher p = ${fmtP(fisher(first.k, first.n - first.k, last.k, last.n - last.k))}.`);
  const atEnd = mine.filter((c) => c.depth === 1);
  const rest = mine.filter((c) => c.depth > 0 && c.depth < 1);
  const kE = atEnd.filter((c) => c.verdict === 'exact').length;
  const kR = rest.filter((c) => c.verdict === 'exact').length;
  out.push(`- Cause just before the outage (depth 100%): ${kE}/${atEnd.length}. Cause at depth 25 to 75%: ${kR}/${rest.length}. Fisher p = ${fmtP(fisher(kE, atEnd.length - kE, kR, rest.length - kR))}.`);
  const q = mine.filter((c) => c.scenario === 'queue');
  const nq = mine.filter((c) => c.scenario !== 'queue');
  const kq = q.filter((c) => c.verdict === 'exact').length;
  const knq = nq.filter((c) => c.verdict === 'exact').length;
  out.push(`- Queue shape: ${kq}/${q.length}. Other four shapes: ${knq}/${nq.length}. Fisher p = ${fmtP(fisher(kq, q.length - kq, knq, nq.length - knq))}.`);
  const notQ = nq.filter((c) => c.depth > 0 && c.depth < 1);
  const endQ = nq.filter((c) => c.depth === 1);
  out.push(`- Without the queue shape: depth 100% ${endQ.filter((c) => c.verdict === 'exact').length}/${endQ.length}, depth 25 to 75% ${notQ.filter((c) => c.verdict === 'exact').length}/${notQ.length}.`);
  const miss = mine.filter((c) => c.verdict !== 'exact');
  const kinds = miss.reduce((o, c) => ({ ...o, [c.verdict + (c.kind ? `:${c.kind}` : '')]: (o[c.verdict + (c.kind ? `:${c.kind}` : '')] ?? 0) + 1 }), {});
  out.push(`- The ${miss.length} misses: ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  // How far after the outage start the blamed line was, for misses inside the outage.
  const after = miss.filter((c) => c.line && c.line >= truth[c.id].firstSymptomLine).map((c) => c.line - truth[c.id].firstSymptomLine);
  after.sort((a, b) => a - b);
  out.push(`- Misses that blamed a line inside the outage: ${after.length}; lines after the first symptom: median ${after[Math.floor(after.length / 2)] ?? '-'}, ${after.filter((x) => x <= 5).length} within the first 6 lines of the outage, ${after.filter((x) => x === 0).length} exactly the first line of the outage.`, '');
}
writeFileSync(join(ROOT, 'results/stats.md'), out.join('\n') + '\n');
console.log(out.join('\n'));

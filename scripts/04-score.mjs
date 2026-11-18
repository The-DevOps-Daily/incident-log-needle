// Stage 4: score every recorded call. Refuses unstamped, mixed or stale
// files, and records filed under the wrong model. Costs are computed here
// from the reported usage and prices.json, never read from the records.
//
//   node scripts/04-score.mjs [--dir results/raw] [--out results/summary]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildHaystack } from '../lib/haystack.mjs';
import { stampOf, readStamped, RUN_STAMP_FILES } from '../lib/stamp.mjs';
import { MODELS } from '../lib/models.mjs';
import { PRICES, callCost, cachedTokens } from '../lib/cost.mjs';
import { verdict, VERDICTS, wilson, signTest, quantile } from '../lib/score.mjs';
import { LENGTHS, DEPTHS } from '../lib/grid.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const DIR = join(ROOT, arg('dir', 'results/raw'));
const OUT = join(ROOT, arg('out', 'results/summary'));
const STAMP = stampOf(RUN_STAMP_FILES);

const truth = Object.fromEntries(readFileSync(join(ROOT, 'data/truth.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((t) => [t.id, t]));
const rowsCache = {};
function rowsFor(id) {
  if (!rowsCache[id]) {
    const hs = buildHaystack(truth[id]);
    if (hs.truth.sha256 !== truth[id].sha256) throw new Error(`${id}: rebuilt haystack does not match truth`);
    rowsCache[id] = hs.meta;
  }
  return rowsCache[id];
}

// Latest record per (model, haystack); earlier failed attempts are counted.
const calls = [];
const reruns = {};
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.jsonl') || f.endsWith('.jsonl.gz')).sort()) {
  const model = f.replace(/\.jsonl(\.gz)?$/, '');
  if (!MODELS[model]) throw new Error(`${f}: ${model} is not in lib/models.mjs`);
  const recs = readStamped(join(DIR, f), STAMP);
  const latest = {};
  for (const r of recs) {
    if (r.model !== model) throw new Error(`${f}: record for ${r.id} is from ${r.model}`);
    if (!truth[r.id]) throw new Error(`${f}: unknown haystack ${r.id}`);
    if (latest[r.id]) reruns[model] = (reruns[model] ?? 0) + 1;
    latest[r.id] = r;
  }
  calls.push(...Object.values(latest));
}
if (!calls.length) throw new Error(`no records in ${DIR}`);

// The pilot sent four of these logs to every model about an hour before the
// main run, and some models served them from the prompt cache. A pasted
// incident log is new text, so those calls are priced as a first paste (all
// prompt tokens at the input rate) and left out of the latency numbers.
const HIT = 1024;
for (const c of calls) {
  const t = truth[c.id];
  Object.assign(c, verdict(c, t, rowsFor(c.id)));
  c.cost = c.ok && c.usage ? callCost(c.model, c.usage) : 0;
  c.cached = c.ok ? cachedTokens(c.usage) : 0;
  c.cacheHit = c.cached > HIT;
  c.costFirstPaste = c.ok && c.usage ? callCost(c.model, { ...c.usage, prompt_tokens_details: { cached_tokens: 0 }, cache_read_input_tokens: 0 }) : 0;
}

const models = [...new Set(calls.map((c) => c.model))].sort((a, b) => PRICES[a].input - PRICES[b].input);
const pct = (k, n) => (n ? (100 * k) / n : null);
const stats = (xs) => ({ n: xs.length, p50: quantile(xs, 0.5), p90: quantile(xs, 0.9), max: xs.length ? Math.max(...xs) : null });

const summary = {
  stamp: STAMP,
  calls: calls.length,
  firstCall: calls.map((c) => c.startedAt).sort()[0],
  lastCall: calls.map((c) => c.startedAt).sort().at(-1),
  prices: PRICES._source,
  models: {},
  pairs: [],
};

for (const m of models) {
  const mine = calls.filter((c) => c.model === m);
  const byLen = {};
  for (const L of LENGTHS) {
    const cs = mine.filter((c) => c.tokens === L);
    if (!cs.length) continue;
    const counts = Object.fromEntries(VERDICTS.map((v) => [v, cs.filter((c) => c.verdict === v).length]));
    const ok = cs.filter((c) => c.ok);
    const timed = ok.filter((c) => !c.cacheHit);
    const exact = counts.exact;
    byLen[L] = {
      n: cs.length,
      counts,
      exactPct: pct(exact, cs.length),
      exactCI: wilson(exact, cs.length).map((x) => 100 * x),
      foundPct: pct(exact + counts.wrong_number, cs.length),
      byDepth: Object.fromEntries(DEPTHS.map((d) => {
        const ds = cs.filter((c) => c.depth === d);
        return [d, { n: ds.length, exact: ds.filter((c) => c.verdict === 'exact').length }];
      })),
      promptTokens: stats(ok.map((c) => c.usage?.prompt_tokens).filter(Number.isFinite)),
      cachedTokens: ok.reduce((s, c) => s + c.cached, 0),
      cacheHits: ok.filter((c) => c.cacheHit).map((c) => c.id),
      outputTokens: stats(ok.map((c) => c.usage?.completion_tokens).filter(Number.isFinite)),
      costPerCall: ok.length ? ok.reduce((s, c) => s + c.costFirstPaste, 0) / ok.length : null,
      billedPerCall: ok.length ? ok.reduce((s, c) => s + c.cost, 0) / ok.length : null,
      ttftMs: stats(timed.map((c) => c.ttftMs).filter(Number.isFinite)),
      totalMs: stats(timed.map((c) => c.totalMs)),
    };
  }
  const n = mine.length;
  const exact = mine.filter((c) => c.verdict === 'exact').length;
  const firstMiss = LENGTHS.find((L) => byLen[L] && byLen[L].counts.exact < byLen[L].n);
  summary.models[m] = {
    name: PRICES[m].name,
    price: { input: PRICES[m].input, cachedInput: PRICES[m].cachedInput, output: PRICES[m].output },
    n,
    exact,
    exactPct: pct(exact, n),
    exactCI: wilson(exact, n).map((x) => 100 * x),
    firstLengthWithMiss: firstMiss ?? null,
    spend: mine.reduce((s, c) => s + c.cost, 0),
    spendFirstPaste: mine.reduce((s, c) => s + c.costFirstPaste, 0),
    cacheHits: mine.filter((c) => c.cacheHit).map((c) => `${c.id} (${c.cached} of ${c.usage.prompt_tokens} prompt tokens)`),
    retriedCalls: mine.filter((c) => c.attempts?.length > 1).length,
    refusedAttempts: mine.reduce((s, c) => s + (c.attempts?.filter((a) => a.status !== 200).length ?? 0), 0) - mine.filter((c) => !c.ok).length,
    attemptStatuses: mine.flatMap((c) => c.attempts ?? []).reduce((o, a) => ({ ...o, [a.status]: (o[a.status] ?? 0) + 1 }), {}),
    finish: mine.reduce((o, c) => ({ ...o, [c.finish ?? 'none']: (o[c.finish ?? 'none'] ?? 0) + 1 }), {}),
    reruns: reruns[m] ?? 0,
    byScenario: Object.fromEntries([...new Set(mine.map((c) => c.scenario))].sort().map((s) => {
      const ss = mine.filter((c) => c.scenario === s);
      return [s, { n: ss.length, exact: ss.filter((c) => c.verdict === 'exact').length }];
    })),
    byLength: byLen,
    nonExact: mine.filter((c) => c.verdict !== 'exact').map((c) => ({ id: c.id, scenario: c.scenario, verdict: c.verdict, line: c.line ?? null, needle: truth[c.id].needleLine, kind: c.kind ?? null, component: c.component ?? null, how: c.how ?? null, finish: c.finish, error: c.error?.slice(0, 160) ?? null })),
  };
}

// Paired comparisons on the haystacks both models saw.
for (let i = 0; i < models.length; i++)
  for (let j = i + 1; j < models.length; j++) {
    const A = Object.fromEntries(calls.filter((c) => c.model === models[i]).map((c) => [c.id, c.verdict === 'exact']));
    const B = Object.fromEntries(calls.filter((c) => c.model === models[j]).map((c) => [c.id, c.verdict === 'exact']));
    const shared = Object.keys(A).filter((id) => id in B);
    const b = shared.filter((id) => A[id] && !B[id]).length;
    const c = shared.filter((id) => !A[id] && B[id]).length;
    summary.pairs.push({ a: models[i], b: models[j], shared: shared.length, onlyA: b, onlyB: c, p: signTest(b, c) });
  }

writeFileSync(`${OUT}.json`, JSON.stringify(summary, null, 1) + '\n');

// Markdown report.
const f1 = (x) => (x == null ? '-' : x.toFixed(1));
const s1 = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)} s`);
const md = [`# Results`, '', `${calls.length} scored calls, stamp \`${STAMP}\`, ${summary.firstCall} to ${summary.lastCall}. Prices: ${PRICES._source}`, ''];
md.push('## Root-cause line found (exact line number), by length', '');
md.push(`| Model | ${LENGTHS.map((L) => `${L / 1000}k`).join(' | ')} | All (95% CI) |`);
md.push(`| --- | ${LENGTHS.map(() => '---').join(' | ')} | --- |`);
for (const m of models) {
  const s = summary.models[m];
  md.push(`| ${s.name} | ${LENGTHS.map((L) => (s.byLength[L] ? `${s.byLength[L].counts.exact}/${s.byLength[L].n}` : 'n/a')).join(' | ')} | ${s.exact}/${s.n} (${f1(s.exactCI[0])} to ${f1(s.exactCI[1])}%) |`);
}
md.push('', '## Verdicts by model and length', '');
md.push(`| Model | Length | ${VERDICTS.join(' | ')} |`, `| --- | --- | ${VERDICTS.map(() => '---').join(' | ')} |`);
for (const m of models)
  for (const [L, b] of Object.entries(summary.models[m].byLength)) md.push(`| ${summary.models[m].name} | ${L / 1000}k | ${VERDICTS.map((v) => b.counts[v]).join(' | ')} |`);
md.push('', '## Exact by length and depth (out of 3 haystacks per cell)', '');
for (const m of models) {
  md.push(`### ${summary.models[m].name}`, '', `| Length | ${DEPTHS.map((d) => `${d * 100}%`).join(' | ')} |`, `| --- | ${DEPTHS.map(() => '---').join(' | ')} |`);
  for (const [L, b] of Object.entries(summary.models[m].byLength)) md.push(`| ${L / 1000}k | ${DEPTHS.map((d) => `${b.byDepth[d].exact}/${b.byDepth[d].n}`).join(' | ')} |`);
  md.push('');
}
md.push('## Cost, tokens and latency per call', '', '$ per call prices every prompt token at the input rate (a first paste). Latency leaves out calls served from the prompt cache (listed below).', '', '| Model | Length | Prompt tokens (p50) | Output tokens (p50) | $ per call | TTFT p50 / p90 | Total p50 / p90 / max |', '| --- | --- | --- | --- | --- | --- | --- |');
for (const m of models)
  for (const [L, b] of Object.entries(summary.models[m].byLength))
    md.push(`| ${summary.models[m].name} | ${L / 1000}k | ${b.promptTokens.p50 ?? '-'} | ${b.outputTokens.p50 ?? '-'} | ${b.costPerCall?.toFixed(5) ?? '-'} | ${s1(b.ttftMs.p50)} / ${s1(b.ttftMs.p90)} | ${s1(b.totalMs.p50)} / ${s1(b.totalMs.p90)} / ${s1(b.totalMs.max)} |`);
md.push('', '## Paired comparisons (same haystacks, exact sign test)', '', '| A | B | Shared | Only A right | Only B right | p |', '| --- | --- | --- | --- | --- | --- |');
for (const p of summary.pairs) md.push(`| ${PRICES[p.a].name} | ${PRICES[p.b].name} | ${p.shared} | ${p.onlyA} | ${p.onlyB} | ${p.p.toFixed(3)} |`);
md.push('', '## Every answer that was not the exact line', '');
for (const m of models) for (const x of summary.models[m].nonExact) md.push(`- ${summary.models[m].name} ${x.id} (${x.scenario}): ${x.verdict}${x.line ? ` line ${x.line} (needle ${x.needle}, ${x.kind ?? ''} ${x.component ?? ''})` : ''}${x.error ? ` ${x.error}` : ''}${x.finish && x.finish !== 'stop' ? ` finish=${x.finish}` : ''}`);
md.push('', '## Calls served from the prompt cache (warmed by pilot 2)', '');
for (const m of models) md.push(`- ${summary.models[m].name}: ${summary.models[m].cacheHits.join(', ') || 'none'}`);
md.push('', '## Retries', '');
for (const m of models) { const s = summary.models[m]; md.push(`- ${s.name}: ${s.retriedCalls} calls needed a retry; attempt statuses ${JSON.stringify(s.attemptStatuses)}; finish ${JSON.stringify(s.finish)}`); }
writeFileSync(`${OUT}.md`, md.join('\n') + '\n');
console.log(md.slice(0, 16).join('\n'));
console.log(`spend in these records: $${calls.reduce((s, c) => s + c.cost, 0).toFixed(4)}`);

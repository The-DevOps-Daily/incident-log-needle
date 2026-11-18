// Stage 5b: score the two-step baselines with the same verdict rules, and put
// them next to the same model given the whole log (results/raw).
//
//   node scripts/05b-score-two-step.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildHaystack } from '../lib/haystack.mjs';
import { readJsonl } from '../lib/spend.mjs';
import { PRICES, callCost, cachedTokens } from '../lib/cost.mjs';
import { verdict, VERDICTS, wilson, quantile, signTest } from '../lib/score.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DIR = join(ROOT, 'results/two-step');
const truth = Object.fromEntries(readFileSync(join(ROOT, 'data/truth.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((t) => [t.id, t]));
const meta = {};
const rowsFor = (id) => (meta[id] ??= buildHaystack(truth[id]).meta);
const firstPaste = (model, u) => (u ? callCost(model, { ...u, prompt_tokens_details: { cached_tokens: 0 }, cache_read_input_tokens: 0 }) : 0);

const groups = {};
for (const f of readdirSync(DIR).filter((f) => /\.jsonl(\.gz)?$/.test(f))) {
  const recs = readJsonl(join(DIR, f));
  const stamps = new Set(recs.map((r) => r.stamp));
  if (stamps.size !== 1 || stamps.has(undefined)) throw new Error(`${f}: missing or mixed stamps`);
  for (const r of recs) {
    const v = verdict({ ok: r.final.ok, content: r.final.content }, truth[r.id], rowsFor(r.id));
    const key = `${r.method}|${r.model}|${r.tokens}`;
    (groups[key] ??= []).push({
      ...r,
      ...v,
      cost: r.calls.reduce((s, c) => s + firstPaste(r.model, c.usage), 0),
      promptTokens: r.calls.reduce((s, c) => s + (c.usage?.prompt_tokens ?? 0), 0),
      cached: r.calls.reduce((s, c) => s + cachedTokens(c.usage), 0),
      wall: r.wallMs ?? r.final.totalMs,
      failedCalls: r.calls.filter((c) => !c.ok).length,
    });
  }
}

// The same model with the whole log, from the main run.
const whole = {};
for (const f of readdirSync(join(ROOT, 'results/raw')).filter((f) => /\.jsonl(\.gz)?$/.test(f))) {
  for (const r of readJsonl(join(ROOT, 'results/raw', f))) {
    const v = verdict(r, truth[r.id], rowsFor(r.id));
    const key = `whole|${r.model}|${r.tokens}`;
    (whole[key] ??= []).push({ ...r, ...v, cost: firstPaste(r.model, r.usage), promptTokens: r.usage?.prompt_tokens ?? 0, wall: r.totalMs, cacheHit: cachedTokens(r.usage) > 1024 });
  }
}

const rows = [];
const add = (method, model, tokens, xs) => {
  if (!xs?.length) return;
  const counts = Object.fromEntries(VERDICTS.map((v) => [v, xs.filter((x) => x.verdict === v).length]));
  const timed = xs.filter((x) => !x.cacheHit);
  // Paired with the same model on the whole log (same haystacks).
  const w = Object.fromEntries((whole[`whole|${model}|${tokens}`] ?? []).map((x) => [x.id, x.verdict === 'exact']));
  const shared = method === 'whole' ? [] : xs.filter((x) => x.id in w);
  const onlyThis = shared.filter((x) => x.verdict === 'exact' && !w[x.id]).length;
  const onlyWhole = shared.filter((x) => x.verdict !== 'exact' && w[x.id]).length;
  rows.push({
    method, model, name: PRICES[model].name, tokens, n: xs.length, counts,
    exact: counts.exact,
    exactCI: wilson(counts.exact, xs.length).map((x) => 100 * x),
    needleSent: method.startsWith('grep') ? xs.filter((x) => x.keptNeedle).length : method === 'chunks' ? xs.filter((x) => x.candidatesHaveNeedle).length : xs.length,
    keptLines: method.startsWith('grep') ? quantile(xs.map((x) => x.keptLines), 0.5) : method === 'chunks' ? quantile(xs.map((x) => x.candidates), 0.5) : null,
    promptTokens: quantile(xs.map((x) => x.promptTokens), 0.5),
    costPerQuery: xs.reduce((s, x) => s + x.cost, 0) / xs.length,
    wallP50: quantile(timed.map((x) => x.wall), 0.5),
    wallP90: quantile(timed.map((x) => x.wall), 0.9),
    failedCalls: xs.reduce((s, x) => s + (x.failedCalls ?? (x.ok ? 0 : 1)), 0),
    vsWhole: shared.length ? { shared: shared.length, onlyThis, onlyWhole, p: signTest(onlyThis, onlyWhole) } : null,
  });
};
const models = [...new Set(Object.keys(groups).map((k) => k.split('|')[1]))];
const lengths = [...new Set(Object.keys(groups).map((k) => Number(k.split('|')[2])))].sort((a, b) => a - b);
for (const model of models)
  for (const tokens of lengths) {
    add('whole', model, tokens, whole[`whole|${model}|${tokens}`]);
    for (const method of ['grep-errors', 'grep-changes', 'chunks']) add(method, model, tokens, groups[`${method}|${model}|${tokens}`]);
  }

writeFileSync(join(ROOT, 'results/two-step-summary.json'), JSON.stringify(rows, null, 1) + '\n');
const s1 = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)} s`);
const md = ['# Two-step baselines', '', 'Same verdict rules as the main run. "Cause sent" counts the logs where the root-cause line reached the model that gave the final answer: kept by the filter, or picked as a candidate by the chunk pass. Cost prices every prompt token at the input rate. Wall time for chunks is the parallel map pass plus the final call.', '', '| Model | Length | Method | Exact (95% CI) | Cause sent | Lines kept / candidates (p50) | Prompt tokens per query (p50) | $ per query | Wall p50 / p90 | Verdicts | Against the whole log (only this right / only whole right, sign test p) |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
for (const r of rows)
  md.push(`| ${r.name} | ${r.tokens / 1000}k | ${r.method} | ${r.exact}/${r.n} (${r.exactCI[0].toFixed(0)} to ${r.exactCI[1].toFixed(0)}%) | ${r.needleSent}/${r.n} | ${r.keptLines ?? '-'} | ${Math.round(r.promptTokens)} | ${r.costPerQuery.toFixed(5)} | ${s1(r.wallP50)} / ${s1(r.wallP90)} | ${VERDICTS.filter((v) => r.counts[v]).map((v) => `${v} ${r.counts[v]}`).join(', ')} | ${r.vsWhole ? `${r.vsWhole.onlyThis} / ${r.vsWhole.onlyWhole}, p = ${r.vsWhole.p.toFixed(3)}` : '-'} |`);
writeFileSync(join(ROOT, 'results/two-step-summary.md'), md.join('\n') + '\n');
console.log(md.join('\n'));

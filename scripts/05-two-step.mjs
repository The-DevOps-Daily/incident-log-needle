// Stage 5: the cheaper alternatives to pasting the whole log.
//
//   grep-errors   keep only error and warning lines, send those
//   grep-changes  keep error and warning lines plus lines that look like a
//                 change (config, patch, reload, ...), send those
//   chunks        split the log into ~20k-token parts, ask for up to 3
//                 candidates per part, then ask once more with the real text
//                 of every candidate line and the last 40 lines of the log
//
// Every answer is scored with the same rules as the main run (lib/score.mjs).
// The filters were fixed before any of these runs. The change words in
// grep-changes were chosen by people who know what the planted causes look
// like, so that filter is a best case for grep.
//
//   node scripts/05-two-step.mjs --methods grep-errors,grep-changes,chunks --models openai-gpt-oss-120b --lengths 100000,200000
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { chat } from '../lib/client.mjs';
import { SYSTEM } from '../lib/prompt.mjs';
import { stampOf, lock } from '../lib/stamp.mjs';
import { countedSpend, CAP_USD, readJsonl } from '../lib/spend.mjs';
import { worstCaseCost } from '../lib/cost.mjs';
import { ERRORS, CHANGES, CHUNK_TOKENS, MAP_SYSTEM, mapPrompt, filteredPrompt, reducePrompt, chunkLines } from '../lib/twostep.mjs';
import { CHARS_PER_TOKEN } from '../lib/haystack.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const methods = arg('methods', 'grep-errors,grep-changes,chunks').split(',');
const models = arg('models', 'openai-gpt-oss-120b').split(',');
const lengths = arg('lengths', '100000,200000').split(',').map(Number);
const CONCURRENCY = Number(arg('concurrency', 3));
const OUT = join(ROOT, 'results/two-step');
mkdirSync(OUT, { recursive: true });

const STAMP = stampOf(['lib/client.mjs', 'lib/prompt.mjs', 'lib/twostep.mjs', 'lib/haystack.mjs', 'lib/scenarios.mjs', 'lib/timefmt.mjs', 'lib/rand.mjs', 'lib/grid.mjs', 'data/truth.jsonl', 'scripts/05-two-step.mjs']);
const MAX_OUT = { 'openai-gpt-oss-120b': 4096, 'mistral-3-14B': 2048 };
const truth = readFileSync(join(ROOT, 'data/truth.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((t) => lengths.includes(t.tokens));

const fileFor = (method, model) => join(OUT, `${method}--${model}.jsonl`);
const done = new Set();
const releases = [];
for (const method of methods)
  for (const model of models) {
    const f = fileFor(method, model);
    releases.push(lock(f));
    if (existsSync(f))
      for (const r of readJsonl(f)) {
        if (r.stamp !== STAMP) throw new Error(`${f} has records from another stamp`);
        done.add(`${method}|${model}|${r.id}`);
      }
  }

const jobs = [];
for (const method of methods) for (const model of models) for (const t of truth) if (!done.has(`${method}|${model}|${t.id}`)) jobs.push({ method, model, t });
console.log(`stamp ${STAMP}; to do ${jobs.length}; spend so far $${countedSpend().toFixed(4)} of cap $${CAP_USD}`);

let stopped = false;
function guard(model, chars, maxTokens) {
  const worst = worstCaseCost(model, chars / 2.5, maxTokens);
  if (countedSpend() + worst > CAP_USD) {
    stopped = true;
    throw new Error('spend cap');
  }
}

const slim = (r) => ({ ok: r.ok, status: r.status, attempts: r.attempts, ttftMs: r.ttftMs ?? null, totalMs: r.totalMs, finish: r.finish ?? null, usage: r.usage ?? null, content: r.content ?? null, error: r.error ?? null });

async function runJob({ method, model, t }) {
  const text = readFileSync(join(ROOT, `data/haystacks/${t.id}.txt`), 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== t.sha256) throw new Error(`${t.id}: haystack does not match truth`);
  const lines = text.split('\n');
  const maxTokens = MAX_OUT[model] ?? 8192;
  const row = { stamp: STAMP, method, model, id: t.id, tokens: t.tokens, depth: t.depth, rep: t.rep, scenario: t.scenario, startedAt: new Date().toISOString() };
  if (method === 'grep-errors' || method === 'grep-changes') {
    const keep = lines.filter((l) => ERRORS.test(l) || (method === 'grep-changes' && CHANGES.test(l)));
    const user = filteredPrompt(t.summary, keep.join('\n'), keep.length, lines.length);
    guard(model, SYSTEM.length + user.length, maxTokens);
    const r = await chat({ model, system: SYSTEM, user, maxTokens });
    Object.assign(row, { keptLines: keep.length, keptNeedle: keep.some((l) => l.includes(t.needleKey)), promptChars: SYSTEM.length + user.length, maxTokens, final: slim(r), calls: [slim(r)] });
  } else if (method === 'chunks') {
    const parts = chunkLines(lines, Math.round(CHUNK_TOKENS * CHARS_PER_TOKEN));
    const t0 = performance.now();
    const maps = await Promise.all(parts.map(async (part, i) => {
      const user = mapPrompt(t.summary, part.join('\n'), i + 1, parts.length);
      guard(model, MAP_SYSTEM.length + user.length, maxTokens);
      return { r: await chat({ model, system: MAP_SYSTEM, user, maxTokens }), chars: MAP_SYSTEM.length + user.length };
    }));
    const mapMs = Math.round(performance.now() - t0);
    const cands = new Map();
    for (const { r } of maps) {
      if (!r.ok || !r.content) continue;
      const body = r.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
      let list = [];
      try {
        list = JSON.parse(body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1)).candidates ?? [];
      } catch {
        list = [...body.matchAll(/"line"\s*:\s*(\d+)/g)].map((m) => ({ line: Number(m[1]) }));
      }
      for (const c of list) if (Number.isInteger(Number(c.line)) && lines[Number(c.line) - 1]) cands.set(Number(c.line), lines[Number(c.line) - 1]);
    }
    const sorted = [...cands.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l);
    const user = reducePrompt(t.summary, sorted.join('\n'), lines.slice(-40).join('\n'));
    guard(model, SYSTEM.length + user.length, maxTokens);
    const r = await chat({ model, system: SYSTEM, user, maxTokens });
    Object.assign(row, {
      parts: parts.length,
      candidates: sorted.length,
      candidatesHaveNeedle: sorted.some((l) => l.includes(t.needleKey)),
      mapWallMs: mapMs,
      wallMs: mapMs + r.totalMs,
      maxTokens,
      final: slim(r),
      calls: [...maps.map(({ r }) => slim(r)), slim(r)],
    });
  }
  appendFileSync(fileFor(method, model), JSON.stringify(row) + '\n');
  console.log(`${method} ${model} ${t.id} final=${row.final.ok ? 'ok' : row.final.status} kept=${row.keptLines ?? row.candidates} spent=$${countedSpend().toFixed(4)}`);
}

let i = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (!stopped && i < jobs.length) {
    const job = jobs[i++];
    try {
      await runJob(job);
    } catch (e) {
      if (e.message === 'spend cap') console.log('stopping at the spend cap');
      else throw e;
    }
  }
}));
releases.forEach((r) => r());
console.log(`done; spend $${countedSpend().toFixed(4)}`);

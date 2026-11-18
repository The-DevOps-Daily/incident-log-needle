// Stage 3: send every haystack to every model. One JSON line per call in
// <out>/<model>.jsonl with the reply, the reasoning text, token usage, time
// to first token, total time and every attempt. Re-running skips calls that
// are already on disk, so a crash or a budget stop resumes where it left off.
//
//   node scripts/03-run-models.mjs [--models a,b] [--ids id1,id2] [--out results/raw]
//                                  [--concurrency 4] [--per-model 2] [--retry-failed]
//
// The runner stops before our own count of spend (lib/spend.mjs, every call
// recorded under results/) plus the worst case of the calls in flight passes
// SPEND_CAP_USD (default $14).
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { chat } from '../lib/client.mjs';
import { SYSTEM, userPrompt } from '../lib/prompt.mjs';
import { MODELS } from '../lib/models.mjs';
import { stampOf, lock, RUN_STAMP_FILES } from '../lib/stamp.mjs';
import { countedSpend, CAP_USD, readJsonl } from '../lib/spend.mjs';
import { worstCaseCost } from '../lib/cost.mjs';
import { mulberry32 } from '../lib/rand.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const OUT = join(ROOT, arg('out', 'results/raw'));
const CONCURRENCY = Number(arg('concurrency', 4));
const PER_MODEL = Number(arg('per-model', 2));
const RETRY_FAILED = process.argv.includes('--retry-failed');
const models = arg('models', Object.keys(MODELS).filter((m) => !MODELS[m].pilotOnly).join(',')).split(',');
const onlyIds = arg('ids', null)?.split(',');

const STAMP = stampOf(RUN_STAMP_FILES);
mkdirSync(OUT, { recursive: true });

const truth = readFileSync(join(ROOT, 'data/truth.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const fileFor = (m) => join(OUT, `${m}.jsonl`);
const releases = models.map((m) => {
  if (!MODELS[m]) throw new Error(`${m} is not in lib/models.mjs`);
  return lock(fileFor(m));
});

// What is already on disk for this stamp.
const done = new Set();
for (const m of models) {
  const f = fileFor(m);
  if (!existsSync(f)) continue;
  for (const r of readJsonl(f)) {
    if (r.stamp !== STAMP) throw new Error(`${f} has records from another stamp (${r.stamp}, now ${STAMP}); move it away first`);
    if (r.ok || !RETRY_FAILED) done.add(`${r.model}|${r.id}`);
  }
}

const jobs = [];
for (const m of models)
  for (const t of truth) {
    if (onlyIds && !onlyIds.includes(t.id)) continue;
    if (t.tokens > MODELS[m].maxLength || !MODELS[m].reps.includes(t.rep)) continue;
    if (!done.has(`${m}|${t.id}`)) jobs.push({ model: m, t });
  }
// Interleave models and cells so a slow hour on the service does not land on
// one model or one length.
const rand = mulberry32(20261118);
for (let i = jobs.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [jobs[i], jobs[j]] = [jobs[j], jobs[i]];
}

let spent = countedSpend();
let inflightWorst = 0;
console.log(`stamp ${STAMP}; on disk: ${done.size} calls; spend so far $${spent.toFixed(4)} of cap $${CAP_USD}; to do: ${jobs.length} calls`);

const running = Object.fromEntries(models.map((m) => [m, 0]));
let stopped = false;
let finished = 0;

async function runJob({ model, t }) {
  const text = readFileSync(join(ROOT, `data/haystacks/${t.id}.txt`), 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== t.sha256) throw new Error(`${t.id}: haystack file does not match truth; run scripts/01 again`);
  const user = userPrompt(t.summary, text);
  const cfg = MODELS[model];
  const worst = worstCaseCost(model, (SYSTEM.length + user.length) / 2.5, cfg.maxTokens);
  if (spent + inflightWorst + worst > CAP_USD) {
    stopped = true;
    console.log(`stopping: $${spent.toFixed(4)} spent + $${inflightWorst.toFixed(4)} in flight + $${worst.toFixed(4)} would pass the cap`);
    return;
  }
  inflightWorst += worst;
  const startedAt = new Date().toISOString();
  const r = await chat({ model, system: SYSTEM, user, maxTokens: cfg.maxTokens });
  inflightWorst -= worst;
  const row = {
    stamp: STAMP,
    model,
    id: t.id,
    tokens: t.tokens,
    depth: t.depth,
    rep: t.rep,
    scenario: t.scenario,
    startedAt,
    ok: r.ok,
    status: r.status,
    attempts: r.attempts,
    served: r.servedModel ?? null,
    ttftMs: r.ttftMs ?? null,
    totalMs: r.totalMs,
    finish: r.finish ?? null,
    usage: r.usage ?? null,
    promptChars: SYSTEM.length + user.length,
    maxTokens: cfg.maxTokens,
    content: r.content ?? null,
    reasoning: r.reasoning ?? null,
    error: r.error ?? null,
  };
  appendFileSync(fileFor(model), JSON.stringify(row) + '\n');
  spent = countedSpend();
  finished++;
  const u = r.usage;
  console.log(`${finished}/${jobs.length} ${model} ${t.id} ${r.ok ? 'ok' : `HTTP ${r.status}`} in=${u?.prompt_tokens ?? '-'} out=${u?.completion_tokens ?? '-'} ttft=${r.ttftMs ?? '-'}ms total=${r.totalMs}ms attempts=${r.attempts.length} spent=$${spent.toFixed(4)}`);
}

async function worker() {
  while (!stopped) {
    const k = jobs.findIndex((j, i) => i >= 0 && j && running[j.model] < PER_MODEL);
    if (k < 0) {
      if (jobs.every((j) => !j)) return;
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    const job = jobs[k];
    jobs[k] = null;
    running[job.model]++;
    try {
      await runJob(job);
    } finally {
      running[job.model]--;
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
releases.forEach((r) => r());
console.log(`finished ${finished} calls; spend $${countedSpend().toFixed(4)}`);

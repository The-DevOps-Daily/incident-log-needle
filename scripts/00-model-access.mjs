// Stage 0: which chat models can this key use, and what context length does
// GET /v1/models report for each? One tiny call per candidate model.
//
//   node scripts/00-model-access.mjs [model,model,...]
import { writeFileSync, appendFileSync } from 'node:fs';
import { inferenceKey, BASE_URL } from '../lib/env.mjs';
import { chat } from '../lib/client.mjs';
import { PRICES, callCost } from '../lib/cost.mjs';
import { countedSpend, CAP_USD } from '../lib/spend.mjs';

const key = inferenceKey();
const listed = await (await fetch(`${BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` } })).json();
const ctx = Object.fromEntries((listed.data ?? []).map((m) => [m.id, m.context_length ?? null]));
const candidates = (process.argv[2]?.split(',') ?? Object.keys(PRICES).filter((k) => !k.startsWith('_')));

const day = new Date().toISOString().slice(0, 10);
const out = new URL(`../results/access/model-access-${day}.txt`, import.meta.url);
const raw = new URL(`../results/access/model-access-${day}.jsonl`, import.meta.url);
writeFileSync(out, `GET /v1/models on ${new Date().toISOString()}: ${Object.keys(ctx).length} models listed\n\n`);
for (const model of candidates) {
  if (countedSpend() > CAP_USD) throw new Error('spend cap reached');
  const r = await chat({ model, system: 'You are a test.', user: 'Reply with the single word: ok', maxTokens: 1024 });
  const row = {
    model,
    listedContext: ctx[model] ?? null,
    status: r.ok ? 200 : r.status,
    ok: r.ok,
    served: r.servedModel ?? null,
    ttftMs: r.ttftMs ?? null,
    totalMs: r.totalMs,
    usage: r.usage ?? null,
    reasoningChars: r.reasoning?.length ?? 0,
    content: r.content?.slice(0, 80) ?? null,
    error: r.error?.slice(0, 200) ?? null,
  };
  appendFileSync(raw, JSON.stringify(row) + '\n');
  const cost = r.ok && r.usage ? callCost(model, r.usage) : 0;
  const line = `${model.padEnd(28)} ctx ${String(row.listedContext).padEnd(8)} HTTP ${row.status} ${r.totalMs} ms reasoning chars ${row.reasoningChars} ` +
    (r.ok ? `answer ${JSON.stringify(row.content)} $${cost.toFixed(6)}` : `error ${row.error}`);
  appendFileSync(out, line + '\n');
  console.log(line);
}

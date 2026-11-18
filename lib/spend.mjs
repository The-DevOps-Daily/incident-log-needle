// Our own count of DigitalOcean spend: every call any script recorded under
// results/ (including runs already in the repo, gzipped or not), priced from
// its reported usage, or at the worst case when a call returned no usage.
// Runners stop before this passes the cap. Set SPEND_CAP_USD to change it.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { callCost, worstCaseCost } from './cost.mjs';

const RESULTS = new URL('../results', import.meta.url).pathname;
export const CAP_USD = Number(process.env.SPEND_CAP_USD ?? 14);

function* jsonlFiles(dir) {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* jsonlFiles(p);
    else if (f.endsWith('.jsonl') || f.endsWith('.jsonl.gz')) yield p;
  }
}

export function readJsonl(file) {
  const buf = readFileSync(file);
  const text = file.endsWith('.gz') ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export function recordCost(r) {
  if (!r.model) return 0;
  // Two-step records hold several calls.
  if (Array.isArray(r.calls)) return r.calls.reduce((s, c) => s + (c.usage ? callCost(r.model, c.usage) : c.ok ? worstCaseCost(r.model, r.promptChars ?? 0, r.maxTokens ?? 8192) : 0), 0);
  if (r.usage) return callCost(r.model, r.usage);
  // A call that reached the model but returned no usage: count the worst case.
  if (r.ok) return worstCaseCost(r.model, r.promptChars ?? 0, r.maxTokens ?? 8192);
  return 0;
}

export function countedSpend() {
  let usd = 0;
  for (const f of jsonlFiles(RESULTS)) for (const r of readJsonl(f)) usd += recordCost(r);
  return usd;
}

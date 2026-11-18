// Stage 1: build every haystack in the grid. Writes the numbered log text to
// data/haystacks/<id>.txt (not in git: it is rebuilt from the seed) and one
// truth record per haystack to data/truth.jsonl, with the sha256 of the text.
//
//   node scripts/01-build-haystacks.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildHaystack } from '../lib/haystack.mjs';
import { gridSpecs } from '../lib/grid.mjs';

const dir = new URL('../data/haystacks/', import.meta.url);
mkdirSync(dir, { recursive: true });
const truth = [];
for (const spec of gridSpecs()) {
  const hs = buildHaystack(spec);
  writeFileSync(new URL(`${spec.id}.txt`, dir), hs.text);
  truth.push({ ...hs.truth, summary: hs.summary });
}
writeFileSync(new URL('../data/truth.jsonl', import.meta.url), truth.map((t) => JSON.stringify(t)).join('\n') + '\n');
const byLen = {};
for (const t of truth) (byLen[t.tokens] ??= []).push(t);
for (const [len, ts] of Object.entries(byLen)) {
  const lines = ts.map((t) => t.lines);
  const chars = ts.map((t) => t.chars);
  console.log(`${len} tokens: ${ts.length} haystacks, ${Math.min(...lines)}-${Math.max(...lines)} lines, ${Math.min(...chars)}-${Math.max(...chars)} chars`);
}

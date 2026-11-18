// Stage 2: prove the haystacks say what the truth file says. Rebuilds each one
// from its seed (the sha256 must match), runs the independent checks in
// lib/check.mjs, and writes the key lines of a sample to results/hand-check/
// so a person can read them.
//
//   node scripts/02-check-haystacks.mjs [--sample 10]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildHaystack } from '../lib/haystack.mjs';
import { checkHaystack, LOUD } from '../lib/check.mjs';

const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const SAMPLE = Number(arg('sample', 10));
const truth = readFileSync(new URL('../data/truth.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const problems = [];
const counts = {};
for (const t of truth) {
  const text = readFileSync(new URL(`../data/haystacks/${t.id}.txt`, import.meta.url), 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== t.sha256) problems.push(`${t.id}: file does not match the truth sha256`);
  const again = buildHaystack(t);
  if (again.truth.sha256 !== t.sha256) problems.push(`${t.id}: rebuilding from the seed gives different text`);
  problems.push(...checkHaystack(text, t));
  counts[t.scenario] = (counts[t.scenario] ?? 0) + 1;
}
const out = [`Checked ${truth.length} haystacks (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}).`, `Problems: ${problems.length}`, ...problems];
writeFileSync(new URL('../results/haystack-check.txt', import.meta.url), out.join('\n') + '\n');
console.log(out.slice(0, 40).join('\n'));

// Sample for reading by hand: two per scenario, spread over lengths and depths.
const dir = new URL('../results/hand-check/', import.meta.url);
mkdirSync(dir, { recursive: true });
const picked = [];
for (const s of [...new Set(truth.map((t) => t.scenario))]) picked.push(...truth.filter((t) => t.scenario === s).filter((_, i, a) => i === 0 || i === a.length - 1));
for (const t of picked.slice(0, SAMPLE)) {
  const lines = readFileSync(new URL(`../data/haystacks/${t.id}.txt`, import.meta.url), 'utf8').split('\n');
  const show = (n, label) => `${label.padEnd(11)} ${lines[n - 1]}`;
  const loudBefore = lines.slice(0, t.firstSymptomLine - 1).filter((l) => LOUD.test(l));
  const body = [
    `# ${t.id} (${t.scenario}, ${t.tokens} tokens, depth ${t.depth}, ${t.lines} lines)`,
    `Prompt summary: ${t.summary}`,
    '',
    show(t.needleLine, 'NEEDLE'),
    ...t.distractorLines.map((n) => show(n, 'harmless')),
    '',
    'Loud lines before the outage:',
    ...loudBefore,
    '',
    'First 12 lines of the outage:',
    ...lines.slice(t.firstSymptomLine - 1, t.firstSymptomLine + 11),
    '',
    show(t.decoyLine, 'DECOY'),
  ];
  writeFileSync(new URL(`${t.id}.txt`, dir), body.join('\n') + '\n');
}
console.log(`wrote ${Math.min(SAMPLE, picked.length)} hand-check files to results/hand-check/`);
if (problems.length) process.exit(1);

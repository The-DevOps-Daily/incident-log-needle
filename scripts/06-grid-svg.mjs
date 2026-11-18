// Stage 6: draw the accuracy grid (length x depth, one panel per model) from
// results/summary.json as a self-contained SVG.
//
//   node scripts/06-grid-svg.mjs [--in results/summary.json] [--out results/grid.svg]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LENGTHS, DEPTHS } from '../lib/grid.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const summary = JSON.parse(readFileSync(join(ROOT, arg('in', 'results/summary.json')), 'utf8'));
const out = join(ROOT, arg('out', 'results/grid.svg'));

const models = Object.keys(summary.models);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const W = 1200;
const cols = 3;
const panelW = 360;
const panelH = 268;
const gapX = 24;
const gapY = 24;
const left = (W - cols * panelW - (cols - 1) * gapX) / 2;
const top = 132;
const rowsN = Math.ceil(models.length / cols);
const H = top + rowsN * panelH + (rowsN - 1) * gapY + 92;
const cellW = 52;
const cellH = 30;

const fill = (k, n) => {
  if (!n) return { bg: '#1b1b19', fg: '#5f5e58' };
  const r = k / n;
  if (r === 1) return { bg: '#17663f', fg: '#e9fbef' };
  if (r >= 0.5) return { bg: '#8a5a12', fg: '#fff4dc' };
  if (r > 0) return { bg: '#9a3412', fg: '#ffe9dc' };
  return { bg: '#8f1d1d', fg: '#ffe4e4' };
};

const parts = [];
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">`);
parts.push(`<title id="title">Where each model found the root-cause line, by log length and position</title>`);
const descRows = models.map((m) => `${summary.models[m].name}: ${summary.models[m].exact} of ${summary.models[m].n}`).join('; ');
parts.push(`<desc id="desc">One panel per model. Rows are log lengths from 10k to 200k tokens, columns are where the root cause sits, from the first line (0%) to just before the outage (100%). Each cell counts the logs where the model gave the exact line. Totals: ${esc(descRows)}.</desc>`);
parts.push(`<rect width="${W}" height="${H}" rx="24" fill="#090909"/>`);
parts.push(`<text x="${left}" y="58" fill="#9b9a92" font-family="ui-monospace, monospace" font-size="13" letter-spacing="2">ROOT-CAUSE LINE FOUND, BY LOG LENGTH AND POSITION</text>`);
parts.push(`<text x="${left}" y="88" fill="#f3f2ed" font-family="ui-sans-serif, system-ui" font-size="17">Each cell: logs where the model gave the exact line, out of 3 different logs (2 for DeepSeek V4 Pro).</text>`);
parts.push(`<text x="${left}" y="112" fill="#94938c" font-family="ui-sans-serif, system-ui" font-size="14">Columns: position of the cause, from the first line (0%) to just before the outage (100%). Grey: longer than the model accepts.</text>`);

models.forEach((m, i) => {
  const s = summary.models[m];
  const px = left + (i % cols) * (panelW + gapX);
  const py = top + Math.floor(i / cols) * (panelH + gapY);
  parts.push(`<g font-family="ui-sans-serif, system-ui">`);
  parts.push(`<rect x="${px}" y="${py}" width="${panelW}" height="${panelH}" rx="16" fill="#141412" stroke="#34342f"/>`);
  parts.push(`<text x="${px + 20}" y="${py + 32}" fill="#f3f2ed" font-size="17" font-weight="650">${esc(s.name)}</text>`);
  parts.push(`<text x="${px + 20}" y="${py + 54}" fill="#94938c" font-size="13">$${s.price.input.toFixed(2)} per 1M input tokens · ${s.exact} of ${s.n} exact</text>`);
  const gx = px + 72;
  const gy = py + 84;
  DEPTHS.forEach((d, c) => parts.push(`<text x="${gx + c * (cellW + 4) + cellW / 2}" y="${gy - 8}" fill="#94938c" font-size="12" text-anchor="middle">${d * 100}%</text>`));
  LENGTHS.forEach((L, r) => {
    const y = gy + r * (cellH + 4);
    parts.push(`<text x="${gx - 10}" y="${y + cellH / 2 + 4}" fill="#94938c" font-size="12" text-anchor="end">${L / 1000}k</text>`);
    DEPTHS.forEach((d, c) => {
      const cell = s.byLength[L]?.byDepth[d];
      const x = gx + c * (cellW + 4);
      const { bg, fg } = fill(cell?.exact ?? 0, cell?.n ?? 0);
      parts.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="6" fill="${bg}"/>`);
      parts.push(`<text x="${x + cellW / 2}" y="${y + cellH / 2 + 5}" fill="${fg}" font-size="13" font-weight="600" text-anchor="middle">${cell?.n ? `${cell.exact}/${cell.n}` : 'n/a'}</text>`);
    });
  });
  parts.push(`</g>`);
});

const ly = H - 46;
const legend = [
  ['#17663f', 'all found'],
  ['#8a5a12', 'half or more'],
  ['#9a3412', 'some'],
  ['#8f1d1d', 'none'],
  ['#1b1b19', 'not tested (context limit)'],
];
let lx = left;
parts.push(`<g font-family="ui-sans-serif, system-ui" font-size="13" fill="#94938c">`);
for (const [c, label] of legend) {
  parts.push(`<rect x="${lx}" y="${ly - 12}" width="16" height="16" rx="4" fill="${c}" stroke="#34342f"/>`);
  parts.push(`<text x="${lx + 24}" y="${ly + 1}">${label}</text>`);
  lx += 34 + label.length * 7.4;
}
parts.push(`<text x="${W - left}" y="${ly + 1}" text-anchor="end">DigitalOcean Serverless Inference, ${esc(summary.firstCall.slice(0, 10))}</text>`);
parts.push(`</g></svg>`);
writeFileSync(out, parts.join('\n') + '\n');
console.log(`wrote ${out} (${W}x${H})`);

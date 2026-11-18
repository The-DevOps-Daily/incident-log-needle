// Turn one model reply into a verdict. Shared by the scorer and the two-step
// baselines so both judge answers the same way.
//
//   exact         the line number is the root-cause line
//   wrong_number  the quote is the root-cause line, but the number is not
//   decoy         the line (or quote) is the decoy: loud, after the outage began
//   component     another line from the root cause's component
//   symptom       a line from the outage itself (an error, a 5xx, the alert)
//   missed        any other line (a harmless change, noise, background)
//   invalid       the reply has no usable line number
//   error         the call itself failed after retries
export const VERDICTS = ['exact', 'wrong_number', 'decoy', 'component', 'symptom', 'missed', 'invalid', 'error'];

export function parseAnswer(content) {
  if (!content) return { parsed: null, how: 'empty' };
  const text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const j = JSON.parse(text.slice(start, end + 1));
      const line = Number.isInteger(j.line) ? j.line : /^\d+$/.test(String(j.line ?? '').trim()) ? Number(String(j.line).trim()) : null;
      return { parsed: { line, quote: typeof j.quote === 'string' ? j.quote : '', reason: typeof j.reason === 'string' ? j.reason : '' }, how: 'json' };
    } catch {}
  }
  const m = /"line"\s*:\s*"?(\d+)/.exec(text);
  if (m) return { parsed: { line: Number(m[1]), quote: '', reason: '' }, how: 'regex' };
  return { parsed: null, how: 'unparseable' };
}

// rows: [{ kind, component }] for each log line (1-based index = row + 1).
export function verdict(rec, truth, rows) {
  if (!rec.ok) return { verdict: 'error' };
  const { parsed, how } = parseAnswer(rec.content);
  if (!parsed || !parsed.line || parsed.line < 1 || parsed.line > truth.lines) return { verdict: 'invalid', how, line: parsed?.line ?? null };
  const quote = parsed.quote.replace(/\s+/g, ' ');
  const line = parsed.line;
  const base = { how, line, quoteHasNeedle: quote.includes(truth.needleKey) };
  if (line === truth.needleLine) return { ...base, verdict: 'exact' };
  if (base.quoteHasNeedle) return { ...base, verdict: 'wrong_number' };
  if (line === truth.decoyLine || quote.includes(truth.decoyKey)) return { ...base, verdict: 'decoy' };
  const row = rows[line - 1];
  if (row.component === truth.needleComponent) return { ...base, verdict: 'component', kind: row.kind };
  if (row.kind === 'symptom' || row.kind === 'bg-post') return { ...base, verdict: 'symptom', kind: row.kind, component: row.component };
  return { ...base, verdict: 'missed', kind: row.kind, component: row.component };
}

// Wilson score interval for k successes in n trials.
export function wilson(k, n, z = 1.96) {
  if (!n) return [0, 0];
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - r) / d, (c + r) / d];
}

// Exact two-sided sign test (McNemar) on discordant pairs b and c.
export function signTest(b, c) {
  const n = b + c;
  if (!n) return 1;
  const k = Math.min(b, c);
  let p = 0;
  let coef = 1;
  for (let i = 0; i <= n; i++) {
    if (i > 0) coef = (coef * (n - i + 1)) / i;
    if (i <= k) p += coef;
  }
  return Math.min(1, (2 * p) / 2 ** n);
}

export function quantile(xs, q) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

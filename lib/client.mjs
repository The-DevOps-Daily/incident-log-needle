// One streamed chat completion against DigitalOcean Serverless Inference.
// Retries 429, 5xx and network errors with backoff. Every attempt is recorded.
// Latency is the time of the attempt that succeeded, so waiting on a rate
// limit is never counted as model latency. TTFT is the time to the first
// streamed token of any kind (reasoning or answer).
import { inferenceKey, BASE_URL } from './env.mjs';

const BACKOFF_MS = [5_000, 20_000, 60_000];

export async function chat({ model, system, user, maxTokens = 8192, temperature = 0, timeoutMs = 600_000, extra = {} }) {
  const key = inferenceKey();
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature,
    stream: true,
    stream_options: { include_usage: true },
    ...extra,
  });
  const attempts = [];
  for (let a = 0; ; a++) {
    const r = await once(key, body, timeoutMs);
    attempts.push({ status: r.status, ms: r.totalMs, ...(r.error ? { error: r.error } : {}) });
    const retryable = r.status === 0 || r.status === 429 || r.status >= 500;
    if (r.ok || !retryable || a >= BACKOFF_MS.length) return { ...r, attempts };
    await new Promise((res) => setTimeout(res, BACKOFF_MS[a]));
  }
}

async function once(key, body, timeoutMs) {
  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, status: res.status, totalMs: Math.round(performance.now() - t0), error: text.slice(0, 400) };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let ttftMs = null;
    let usage = null;
    let served = null;
    let finish = null;
    let content = '';
    let reasoning = '';
    let streamError = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let chunk;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        if (chunk.error) streamError = JSON.stringify(chunk.error).slice(0, 400);
        served ??= chunk.model ?? null;
        const choice = chunk.choices?.[0];
        const delta = choice?.delta;
        const r = delta?.reasoning_content ?? delta?.reasoning ?? '';
        if (delta && ttftMs === null && (delta.content || r)) ttftMs = Math.round(performance.now() - t0);
        if (delta?.content) content += delta.content;
        if (r) reasoning += r;
        if (choice?.finish_reason) finish = choice.finish_reason;
        if (chunk.usage) usage = chunk.usage;
      }
    }
    const totalMs = Math.round(performance.now() - t0);
    if (streamError && !content) return { ok: false, status: 599, totalMs, error: `stream error: ${streamError}` };
    return { ok: true, status: res.status, servedModel: served, ttftMs, totalMs, finish, content, reasoning, usage };
  } catch (err) {
    return { ok: false, status: 0, totalMs: Math.round(performance.now() - t0), error: String(err).slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}

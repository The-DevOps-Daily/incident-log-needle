// Time formats used inside log lines. Everything is UTC.
const pad = (n, w = 2) => String(n).padStart(w, '0');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmt = {
  // 2026-11-17T09:12:03.412Z, or without milliseconds when ms = 0
  iso: (d, ms = 3) => (ms ? d.toISOString() : d.toISOString().replace(/\.\d{3}Z$/, 'Z')),
  hm: (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  day: (d) => d.toISOString().slice(0, 10),
  // klog header: E1117 09:12:03.412345
  klog: (sev, d) =>
    `${sev}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}${pad((d.getTime() * 7) % 1000, 3)}`,
  // redis: 17 Nov 2026 09:12:03.412
  redis: (d) =>
    `${pad(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`,
};

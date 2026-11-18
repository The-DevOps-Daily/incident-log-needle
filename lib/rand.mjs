// mulberry32: a small seeded generator that stays in 32-bit integer maths.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function helpers(rand) {
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];
  const int = (lo, hi) => Math.floor(lo + rand() * (hi - lo + 1));
  const chance = (p) => rand() < p;
  const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rand() * 16)]).join('');
  const alnum = (n) => Array.from({ length: n }, () => 'bcdfghjklmnpqrstvwxz2456789'[Math.floor(rand() * 27)]).join('');
  const weighted = (pairs) => {
    const total = pairs.reduce((s, [w]) => s + w, 0);
    let r = rand() * total;
    for (const [w, v] of pairs) if ((r -= w) < 0) return v;
    return pairs[pairs.length - 1][1];
  };
  const expGap = (mean) => -Math.log(1 - rand()) * mean;
  return { pick, int, chance, hex, alnum, weighted, expGap };
}

// Stable 32-bit seed from a string, so every haystack id maps to one seed.
export function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

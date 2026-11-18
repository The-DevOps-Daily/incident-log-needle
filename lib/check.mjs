// Independent checks on one haystack text against its truth record. They read
// the text the way a person would (regular expressions on the lines), not the
// generator's own bookkeeping. Returns a list of problems; empty means pass.
import { SCENARIOS } from './scenarios.mjs';

// Every warning or error line before the outage must be one of these known
// harmless families, a planted harmless change, or the needle.
export const HARMLESS_NOISE = [
  /upstream retry" upstream=recommendations attempt=1/,
  /DeprecationWarning|is deprecated/,
  /job failed, will retry" job=thumbnail\.render/,
  /could not receive data from client: Connection reset by peer/,
  /an upstream response is buffered to a temporary file/,
  /redis connection reset by peer, reconnecting/,
  /WARNING Memory overcommit must be enabled/,
  /FailedScheduling pod\/report-export-/,
  /invalid query encoding/,
  /"GET \/api\/search\?q=%ff%fe HTTP\/1\.1" 500 /,
];
export const LOUD = /level=(warn|error|fatal)|\[(warn|error|warning)\]|\bWARNING\b|\bFATAL\b|\bPANIC\b|k8s-event Warning|cert-manager E\d{4}|" 5\d\d /;
// A harmless noise failure must be followed by its recovery within 6 lines.
const RECOVERY = [
  [/upstream retry" upstream=recommendations attempt=1 .*req=(\w+)/, (m) => new RegExp(`retry succeeded.*req=${m[1]}`)],
  [/job failed, will retry" job=thumbnail\.render id=(j_\w+)/, (m) => new RegExp(`job done" job=thumbnail\\.render id=${m[1]} attempt=2`)],
  [/redis connection reset by peer, reconnecting/, () => /redis reconnected/],
  [/FailedScheduling pod\/(report-export-[\w-]+)/, (m) => new RegExp(`Scheduled pod/${m[1]}`)],
];

export function checkHaystack(text, truth) {
  const problems = [];
  const bad = (msg) => problems.push(`${truth.id}: ${msg}`);
  const rows = text.split('\n').map((l) => {
    const m = /^\s*(\d+)\t(\S+) (\S+) (.*)$/.exec(l);
    return m ? { n: Number(m[1]), t: Date.parse(m[2]), comp: m[3].replace(/\[\d+\]:$/, ''), text: `${m[2]} ${m[3]} ${m[4]}` } : null;
  });
  if (rows.some((r) => !r)) return [`${truth.id}: unparseable line`];
  rows.forEach((r, i) => {
    if (r.n !== i + 1) bad(`line ${i + 1} is numbered ${r.n}`);
    if (Number.isNaN(r.t)) bad(`line ${r.n} has no valid timestamp`);
    if (i && r.t < rows[i - 1].t) bad(`line ${r.n} is earlier than line ${r.n - 1}`);
  });
  const Ts = Date.parse(truth.outageStart);
  const first = rows[truth.firstSymptomLine - 1];
  if (first.t !== Ts) bad(`first symptom line ${first.n} is not at the outage start`);
  if (rows.slice(0, truth.firstSymptomLine - 1).some((r) => r.t >= Ts)) bad('a line before the outage has a time at or after the outage start');

  const sc = SCENARIOS[truth.scenario];
  const withKey = rows.filter((r) => r.text.includes(truth.needleKey));
  if (withKey.length !== 1) bad(`needle key found on ${withKey.length} lines`);
  else {
    const nd = withKey[0];
    if (nd.n !== truth.needleLine) bad(`needle is on line ${nd.n}, truth says ${truth.needleLine}`);
    if (nd.t >= Ts) bad('needle is not before the outage');
    if (nd.comp !== truth.needleComponent) bad(`needle component ${nd.comp}, truth says ${truth.needleComponent}`);
  }
  const expectIdx = Math.round(truth.depth * (truth.firstSymptomLine - 2));
  if (truth.needleLine - 1 !== expectIdx) bad(`needle at index ${truth.needleLine - 1}, depth ${truth.depth} gives ${expectIdx}`);

  const decoys = rows.filter((r) => r.text.includes(truth.decoyKey));
  if (decoys.length !== 1) bad(`decoy key found on ${decoys.length} lines`);
  else {
    const d = decoys[0];
    if (d.n !== truth.decoyLine) bad(`decoy is on line ${d.n}, truth says ${truth.decoyLine}`);
    if (d.t <= Ts || d.n <= truth.firstSymptomLine) bad('decoy is not after the outage start');
    if (d.comp === truth.needleComponent) bad('decoy is in the needle component');
  }

  // The needle is the only cause-like line for its resource, and no line hints
  // at another scenario's cause or symptoms.
  for (const [name, other] of Object.entries(SCENARIOS)) {
    const fam = rows.filter((r) => other.checks.family.test(r.text));
    if (name === truth.scenario) {
      if (fam.length !== 1 || fam[0].n !== truth.needleLine) bad(`${fam.length} lines match the ${name} cause pattern (${fam.map((r) => r.n).join(',')})`);
    } else if (fam.length) bad(`lines ${fam.map((r) => r.n).join(',')} match the ${name} cause pattern`);
    const sym = rows.filter((r) => other.checks.symptom.test(r.text));
    if (name === truth.scenario) {
      const early = sym.filter((r) => r.t < Ts);
      if (early.length) bad(`symptom lines before the outage: ${early.map((r) => r.n).join(',')}`);
      if (sym.length < 5) bad(`only ${sym.length} symptom lines`);
    } else if (sym.length) bad(`lines ${sym.map((r) => r.n).join(',')} match ${name} symptoms`);
  }
  const failingPaths = truth.scenario === 'redis' ? /"(POST \/api\/checkout|GET \/api\/cart|POST \/api\/cart\/items) HTTP\/1\.1" 5\d\d/ : /"POST \/api\/checkout HTTP\/1\.1" 5\d\d/;
  const early5xx = rows.filter((r) => r.t < Ts && failingPaths.test(r.text));
  if (early5xx.length) bad(`failing requests before the outage on lines ${early5xx.map((r) => r.n).join(',')}`);

  // Every loud line before the outage is known harmless noise, a planted
  // harmless change, or the needle.
  const planted = new Set([truth.needleLine, ...truth.distractorLines]);
  for (const r of rows.slice(0, truth.firstSymptomLine - 1)) {
    if (!LOUD.test(r.text) || planted.has(r.n)) continue;
    if (!HARMLESS_NOISE.some((re) => re.test(r.text))) bad(`unexplained warning or error before the outage on line ${r.n}: ${r.text.slice(0, 120)}`);
  }
  // Harmless failures recover: each one has its recovery line soon after.
  for (const r of rows) {
    for (const [fail, recovery] of RECOVERY) {
      const m = fail.exec(r.text);
      if (!m) continue;
      const want = recovery(m);
      if (!rows.slice(r.n, r.n + 8).some((x) => want.test(x.text))) bad(`noise on line ${r.n} has no recovery within 8 lines`);
    }
  }
  // Distractor lines are harmless changes before the outage, never the needle.
  for (const n of truth.distractorLines) {
    const r = rows[n - 1];
    if (!r || r.t >= Ts) bad(`distractor line ${n} is not before the outage`);
    if (r && r.text.includes(truth.needleKey)) bad(`distractor line ${n} carries the needle key`);
  }
  return problems;
}

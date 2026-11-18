// Build one incident log ("haystack") from a spec. Fully deterministic: the
// same spec always gives the same text, so the haystacks do not need to be
// stored in git; data/manifest.jsonl keeps the sha256 of each one.
//
// Layout: background lines from a small shop (ingress, APIs, Postgres,
// PgBouncer, Redis, RabbitMQ, Kubernetes events and audit, cert-manager, a
// config agent), harmless noise errors, harmless changes, then the outage.
// The root cause (needle) sits at `depth` of the part before the outage:
// depth 0 is line 1, depth 1 is the last line before the first symptom.
import { createHash } from 'node:crypto';
import { mulberry32, helpers, seedOf } from './rand.mjs';
import { SCENARIOS } from './scenarios.mjs';
import { fmt } from './timefmt.mjs';

export const CHARS_PER_TOKEN = 2.37; // DeepSeek V4 tokens, measured in pilot 1 (results/pilot-1)
export const POST_FRACTION = 0.04; // share of lines after the outage starts
export const POST_MIN_LINES = 30;
const PRE_GAP_S = 4; // mean seconds between lines before the outage
const POST_GAP_S = 1.2;

const SERVICES = ['checkout-api', 'cart-api', 'search-api', 'catalog-api', 'worker'];

function podsFor(h) {
  const pods = {};
  for (const s of SERVICES) {
    const rs = h.alnum(9).replace(/^./, (c) => c);
    pods[s] = [0, 1, 2].map(() => `${s}-${rs}-${h.alnum(5)}`);
  }
  return pods;
}

// Background line families. Each returns a render function (t, ctx) => text.
// `tag` names a noise family so a scenario can exclude it (see scenarios.mjs).
function backgroundFamilies(h, ctx, post) {
  const sc = SCENARIOS[ctx.scenario];
  const pod = (s) => h.pick(ctx.pods[s]);
  const client = () => `${h.pick(['203.0.113', '198.51.100', '192.0.2'])}.${h.int(2, 250)}`;
  const access = () => {
    const route = h.weighted([
      [6, ['GET', `/api/products/${h.int(1000, 9999)}`, 'catalog-api']],
      [5, ['GET', `/api/search?q=${h.pick(['boots', 'rain+jacket', 'socks', 'tent', 'headlamp', 'gloves', 'backpack'])}`, 'search-api']],
      [4, ['GET', '/api/cart', 'cart-api']],
      [3, ['POST', '/api/cart/items', 'cart-api']],
      [2, ['POST', '/api/checkout', 'checkout-api']],
      [2, ['GET', '/healthz', 'checkout-api']],
    ]);
    const [method, path, up] = route;
    let status = h.weighted([[90, method === 'POST' ? 201 : 200], [4, 304], [2, 404], [0.5, 499]]);
    if (status === 304 && method === 'POST') status = 201;
    if (status === 404 && !path.startsWith('/api/products')) status = 200;
    let rt = h.int(3, 180) / 1000;
    const failing = up === 'checkout-api' && path === '/api/checkout' ? true : ctx.scenario === 'redis' && up === 'cart-api';
    if (post && failing && h.chance(0.75)) {
      status = ctx.scenario === 'redis' ? 500 : sc.status;
      rt = status === 504 ? 60.001 : h.int(5, 900) / 1000;
    }
    const bytes = status >= 500 ? h.int(150, 600) : path === '/healthz' ? 2 : h.int(300, 24000);
    return () => `nginx-ingress ${client()} "${method} ${path} HTTP/1.1" ${status} ${bytes} rt=${rt.toFixed(3)} upstream=${up}:8080`;
  };
  const fams = [
    [34, access],
    [6, () => { const id = h.hex(8); return () => `checkout-api level=info msg="order placed" order_id=ord_${id} items=${h.int(1, 6)} total_eur=${h.int(9, 480)}.${h.int(10, 99)} duration_ms=${h.int(40, 400)} trace_id=${h.hex(16)}`; }],
    [5, () => () => `cart-api level=info msg="cart updated" cart=c_${h.hex(10)} items=${h.int(1, 9)} duration_ms=${h.int(2, 40)}`],
    [6, () => () => `search-api level=info msg="search served" q_len=${h.int(3, 18)} hits=${h.int(0, 400)} duration_ms=${h.int(8, 220)} cache=${h.pick(['hit', 'miss', 'hit'])}`],
    [4, () => () => `catalog-api level=info msg="product loaded" product_id=${h.int(1000, 9999)} duration_ms=${h.int(1, 30)}`],
    [4, () => () => `worker level=info msg="job done" job=${h.pick(['email.send', 'thumbnail.render', 'search.reindex', 'email.send'])} id=j_${h.hex(10)} duration_ms=${h.int(20, 2400)}`],
    [1.5, () => () => `rabbitmq [info] <0.${h.int(400, 9000)}.0> accepting AMQP connection 10.244.${h.int(1, 6)}.${h.int(10, 90)}:${h.int(30000, 60000)} -> 10.244.2.3:5672`],
    [1.5, () => () => `pgbouncer[812]: LOG stats: ${h.int(300, 600)} xacts/s, ${h.int(900, 1900)} queries/s, in ${h.int(150, 320)} KB/s, out ${h.int(9, 19) / 10} MB/s, xact ${h.int(1800, 4200)} us, query ${h.int(500, 1100)} us, wait ${h.int(0, 9)} us`],
    [1, () => () => `orders-db[2231]: LOG:  checkpoint starting: time`],
    [1, () => () => `orders-db[2231]: LOG:  checkpoint complete: wrote ${h.int(200, 2000)} buffers (${h.int(1, 9)}.${h.int(0, 9)}%); 0 WAL file(s) added, 0 removed, ${h.int(1, 4)} recycled; write=${h.int(20, 59)}.${h.int(100, 999)} s, sync=0.0${h.int(10, 99)} s, total=${h.int(20, 59)}.${h.int(100, 999)} s`],
    [1, () => () => `orders-db[${h.int(3000, 9000)}]: LOG:  automatic vacuum of table "shop.public.${h.pick(['cart_items', 'sessions', 'order_events'])}": index scans: 1, pages: 0 removed, ${h.int(800, 9000)} remain, tuples: ${h.int(100, 9000)} removed`],
    [1.5, () => {
      const which = h.int(0, 3);
      return (t) => [
        `redis-cache 1:M ${fmt.redis(t)} * 100 changes in 300 seconds. Saving...`,
        `redis-cache 1:M ${fmt.redis(t)} * Background saving started by pid ${h.int(1000, 9000)}`,
        `redis-cache ${h.int(1000, 9000)}:C ${fmt.redis(t)} * DB saved on disk`,
        `redis-cache 1:M ${fmt.redis(t)} * Background saving terminated with success`,
      ][which];
    }],
    [2.5, () => {
      const p = `${h.pick(['report-export', 'search-reindex', 'sitemap-build'])}-${h.int(29380000, 29389999)}-${h.alnum(5)}`;
      const [reason, msg] = h.pick([
        ['Scheduled', `Successfully assigned shop/${p} to pool-shop-${h.alnum(5)}`],
        ['Pulled', 'Container image "registry.example.com/jobs:2.3.1" already present on machine'],
        ['Created', 'Created container job'],
        ['Started', 'Started container job'],
        ['Completed', 'Job completed'],
      ]);
      return () => `k8s-event Normal ${reason} pod/${p} ${msg}`;
    }],
    [1.5, () => () => `k8s-audit user=system:serviceaccount:argocd:argocd-application-controller verb=${h.pick(['get', 'list', 'watch'])} resource=${h.pick(['deployments', 'configmaps', 'services', 'ingresses'])} ns=shop name=${h.pick(SERVICES)}`],
    [0.6, () => (t) => `cert-manager ${fmt.klog('I', t)} controller.go:${h.pick([88, 104, 131])}] certificate default/${h.pick(['shop-web-tls', 'admin-tls', 'grafana-tls'])}: certificate is up to date and has not expired`],
    [0.6, () => () => `config-agent level=info msg="config in sync" target=${h.pick(['search-api', 'catalog-api', 'cart-api', 'redis-cache'])} rev=${h.int(10, 99)}`],
  ];
  return fams;
}

// Harmless noise: errors and warnings that recover or do not matter. Some come
// as a pair (the failure, then the recovery a few lines later).
function noiseFamilies(h, ctx) {
  const sc = SCENARIOS[ctx.scenario];
  const all = [
    ['retry', () => { const id = h.hex(8); return [`search-api level=warn msg="upstream retry" upstream=recommendations attempt=1 err="context deadline exceeded" req=${id}`, `search-api level=info msg="upstream retry succeeded" upstream=recommendations attempt=2 req=${id}`]; }],
    ['deprecation', () => [h.pick([
      'catalog-api level=warn msg="(node:1) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead."',
      'k8s-event Warning Deprecated job/report-export batch/v1beta1 CronJob is deprecated in v1.21+, unavailable in v1.25+; use batch/v1 CronJob',
      'search-api level=warn msg="DeprecationWarning: config key search.timeout is deprecated, use search.timeout_ms"',
    ])]],
    ['job-retry', () => { const id = h.hex(10); return [`worker level=error msg="job failed, will retry" job=thumbnail.render id=j_${id} attempt=1 err="image decode: unexpected EOF"`, `worker level=info msg="job done" job=thumbnail.render id=j_${id} attempt=2 duration_ms=${h.int(200, 900)}`]; }],
    ['db-reset', () => [`orders-db[${h.int(3000, 9000)}]: LOG:  could not receive data from client: Connection reset by peer`]],
    ['slow-query', () => [`orders-db[${h.int(3000, 9000)}]: LOG:  duration: ${h.int(1000, 2600)}.${h.int(100, 999)} ms  statement: SELECT p.id, p.name, sum(oi.qty) FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.created_at > now() - interval '30 days' GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 50`]],
    ['buffered', () => [`nginx-ingress [warn] 31#31: *${h.int(100000, 999999)} an upstream response is buffered to a temporary file /var/cache/nginx/proxy_temp/${h.int(1, 9)}/${h.int(10, 99)}/00000${h.int(10000, 99999)} while reading upstream, client: 203.0.113.${h.int(2, 250)}, server: shop.example.com, request: "GET /api/search?q=boots HTTP/1.1"`]],
    ['redis-reset', () => [`cart-api level=error msg="redis connection reset by peer, reconnecting" addr=redis-cache:6379`, `cart-api level=info msg="redis reconnected" addr=redis-cache:6379 after_ms=${h.int(4, 40)}`]],
    ['redis-overcommit', () => [(t) => `redis-cache 1:M ${fmt.redis(t)} # WARNING Memory overcommit must be enabled! Without it, a background save or replication may fail under low memory condition.`]],
    ['failed-scheduling', () => { const p = `report-export-${h.int(29380000, 29389999)}-${h.alnum(5)}`; return [`k8s-event Warning FailedScheduling pod/${p} 0/6 nodes are available: 6 Insufficient cpu. preemption: 0/6 nodes are available: 6 No preemption victims found for incoming pod.`, `k8s-event Normal Scheduled pod/${p} Successfully assigned shop/${p} to pool-shop-${h.alnum(5)}`]; }],
    ['search-500', () => [`nginx-ingress ${'203.0.113'}.${h.int(2, 250)} "GET /api/search?q=%ff%fe HTTP/1.1" 500 212 rt=0.004 upstream=search-api:8080`, `search-api level=error msg="invalid query encoding" q_len=6 err="malformed UTF-8"`]],
  ];
  const weight = { retry: 3, deprecation: 2, 'job-retry': 2, 'db-reset': 1.5, 'slow-query': 1.5, buffered: 1.5, 'redis-reset': 1, 'redis-overcommit': 0.3, 'failed-scheduling': 1, 'search-500': 1 };
  return all.filter(([tag]) => !sc.exclude.includes(tag)).map((f) => [weight[f[0]], f]);
}

// Harmless changes that every incident can have: deploys of other services.
function genericChanges(h) {
  return [
    (t, ctx) => {
      ctx.searchPatch ??= h.int(0, 6);
      const from = `4.${ctx.searchPatch}`;
      ctx.searchPatch += 1;
      return `k8s-audit user=deploy-bot verb=patch resource=deployments ns=shop name=search-api diff="image: search-api:${from} -> search-api:4.${ctx.searchPatch}"`;
    },
    () => `k8s-event Normal ScalingReplicaSet deployment/catalog-api Scaled up replica set catalog-api-${h.alnum(9)} to ${h.int(2, 4)}`,
  ];
}

const toRender = (x) => (typeof x === 'function' ? x : () => x);
const DUMMY_T = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));

export function buildHaystack(spec) {
  const { id, scenario, tokens, depth } = spec;
  const sc = SCENARIOS[scenario];
  if (!sc) throw new Error(`unknown scenario ${scenario}`);
  const rand = mulberry32(seedOf(id));
  const h = helpers(rand);
  const ctx = { scenario, pods: podsFor(h) };
  const targetChars = Math.round(tokens * CHARS_PER_TOKEN);
  const estLines = Math.round(targetChars / 130);
  const postLines = Math.max(POST_MIN_LINES, Math.round(estLines * POST_FRACTION));
  const preChars = targetChars * (1 - postLines / estLines);

  // 1. Background before the outage, with harmless noise mixed in.
  const pre = [];
  let chars = 0;
  const famsPre = backgroundFamilies(h, ctx, false);
  const noise = noiseFamilies(h, ctx);
  const pending = []; // second halves of noise pairs: [dueIndex, render, tag]
  while (chars < preChars) {
    let line;
    const due = pending.findIndex(([at]) => at <= pre.length);
    if (due >= 0) {
      const [, r, tag] = pending.splice(due, 1)[0];
      line = { kind: 'noise', tag, render: toRender(r) };
    } else if (h.chance(0.025)) {
      const [tag, make] = h.weighted(noise);
      const parts = make();
      line = { kind: 'noise', tag, render: toRender(parts[0]) };
      if (parts[1]) pending.push([pre.length + h.int(1, 4), parts[1], tag]);
    } else {
      line = { kind: 'bg', render: h.weighted(famsPre)() };
    }
    pre.push(line);
    // Size estimate: render once with a placeholder time. Rendering draws from
    // the same seeded generator, so this stays deterministic.
    chars += line.render(DUMMY_T, ctx).length + 32;
  }
  for (const [, r, tag] of pending) pre.push({ kind: 'noise', tag, render: toRender(r) });

  // 2. Harmless changes of the same kind as the needle, and generic deploys.
  const nDistract = 2 + Math.floor(pre.length / 1500);
  const dState = sc.distractors.map(() => ({}));
  for (let i = 0; i < nDistract; i++) {
    const k = i % sc.distractors.length;
    pre.splice(h.int(0, pre.length), 0, { kind: 'distractor', render: sc.distractors[k](h, dState[k]) });
  }
  const nGeneric = 1 + Math.floor(pre.length / 2000);
  for (let i = 0; i < nGeneric; i++) {
    const g = genericChanges(h);
    pre.splice(h.int(0, pre.length), 0, { kind: 'change', render: g[i % g.length] });
  }

  // 3. The needle, at `depth` of the lines before the outage.
  const needle = sc.needle(h);
  const nPre = pre.length + 1;
  const needleIdx = Math.round(depth * (nPre - 1));
  pre.splice(needleIdx, 0, { kind: 'needle', render: needle.render });
  Object.assign(ctx, needle.ctx ?? {});

  // 4. The outage: symptoms, background (with failing checkout requests), an
  //    alert, and one decoy a little after the start.
  const post = [];
  const famsPost = backgroundFamilies(h, ctx, true);
  const symptomWeights = sc.symptoms.map(([w, make]) => [w, make]);
  for (let i = 0; i < postLines; i++) {
    if (i === 0 || h.chance(0.5)) {
      const make = h.weighted(symptomWeights);
      post.push({ kind: 'symptom', render: make(h, ctx) });
    } else {
      post.push({ kind: 'bg-post', render: h.weighted(famsPost)() });
    }
  }
  const alertAt = Math.min(post.length - 1, h.int(8, 14));
  post.splice(alertAt, 0, {
    kind: 'symptom',
    render: () => `alertmanager [firing] CheckoutErrorRate severity=page summary="5xx ratio ${h.int(55, 90) / 100} on POST /api/checkout"`,
  });
  const decoy = sc.decoy(h, ctx);
  const decoyIdx = h.int(Math.floor(post.length * 0.2), Math.floor(post.length * 0.5));
  post.splice(decoyIdx, 0, { kind: 'decoy', render: decoy.render });

  // 5. Timestamps. The outage starts at a whole-ish minute in the afternoon.
  const day = 10 + Math.floor(rand() * 8);
  const Ts = new Date(Date.UTC(2026, 10, day, 13 + h.int(0, 3), h.int(0, 59), h.int(0, 50), h.int(0, 999)));
  ctx.Ts = Ts;
  // A certificate in the cert scenario expires one second before the outage.
  ctx.expiry = new Date(Math.floor(Ts.getTime() / 1000) * 1000 - 1000);
  const preGaps = pre.map(() => Math.max(0.001, h.expGap(PRE_GAP_S)));
  const preSpan = preGaps.reduce((s, g) => s + g, 0);
  let t = Ts.getTime() - preSpan * 1000;
  const lines = [];
  for (let i = 0; i < pre.length; i++) {
    lines.push({ ...pre[i], t: new Date(Math.round(t)) });
    t += preGaps[i] * 1000;
  }
  t = Ts.getTime();
  for (const p of post) {
    lines.push({ ...p, t: new Date(Math.round(t)) });
    t += Math.max(0.001, h.expGap(POST_GAP_S)) * 1000;
  }
  // The first post line is exactly at Ts; every pre line is strictly before it.
  if (lines[pre.length - 1].t >= Ts) lines[pre.length - 1].t = new Date(Ts.getTime() - 37);

  // 6. Render and number.
  const out = [];
  const meta = [];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const text = `${fmt.iso(L.t)} ${L.render(L.t, ctx)}`;
    out.push(text);
    meta.push({ kind: L.kind, tag: L.tag, component: text.split(' ')[1].replace(/\[\d+\]:$/, '') });
  }
  const width = 6;
  const numbered = out.map((l, i) => `${String(i + 1).padStart(width)}\t${l}`).join('\n');
  const truth = {
    id,
    scenario,
    tokens,
    depth,
    rep: spec.rep,
    lines: out.length,
    chars: numbered.length,
    outageStart: fmt.iso(Ts),
    firstSymptomLine: pre.length + 1,
    needleLine: needleIdx + 1,
    needleKey: needle.key,
    needleComponent: sc.component,
    decoyLine: pre.length + decoyIdx + 1,
    decoyKey: decoy.key,
    decoyComponent: decoy.component,
    distractorLines: meta.flatMap((m, i) => (m.kind === 'distractor' || m.kind === 'change' ? [i + 1] : [])),
    noiseLines: meta.flatMap((m, i) => (m.kind === 'noise' ? [i + 1] : [])).length,
    sha256: createHash('sha256').update(numbered).digest('hex'),
  };
  return { text: numbered, raw: out, meta, truth, summary: sc.summary(ctx) };
}

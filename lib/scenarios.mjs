// The five planted incidents. Each one has:
//   needle      the single root-cause line, planted before the outage starts
//   symptoms    lines that appear only after the outage starts
//   decoy       one loud line after the outage starts that looks like a cause
//               but is a consequence (it comes after the first symptoms)
//   distractors harmless changes of the same kind as the needle, planted
//               before the outage (other pools, other certificates, ...)
//   exclude     background noise families that touch the same subsystem, so a
//               harmless noise line can never be a second plausible cause
//   checks      regular expressions the checker uses to prove all of the above
//
// Lines are functions of (t, ctx) because some of them quote times: ctx.Ts is
// the outage start, t is the line's own timestamp (both Date objects).
import { fmt } from './timefmt.mjs';

// Config revisions count up in time order (lines are rendered in time order).
const nextRev = (h, ctx, name) => {
  ctx.revs ??= {};
  ctx.revs[name] = (ctx.revs[name] ?? h.int(40, 70)) + 1;
  return ctx.revs[name];
};

export const SCENARIOS = {
  pool: {
    component: 'pgbouncer',
    summary: (ctx) => `Checkout (POST /api/checkout) started timing out with HTTP 504 at about ${fmt.hm(ctx.Ts)} UTC on ${fmt.day(ctx.Ts)}.`,
    status: 504,
    needle: (h) => {
      const from = h.pick([40, 50, 60]);
      const to = h.pick([4, 5, 6]);
      const rev = h.hex(7);
      const key = `pool "orders" default_pool_size changed ${from} -> ${to}`;
      return { key, render: () => `pgbouncer[812]: LOG RELOAD: ${key} (config rev ${rev})`, ctx: { to } };
    },
    distractors: [
      (h, st) => () => { st.v ??= 10; const from = st.v; st.v += 2; return `pgbouncer[812]: LOG RELOAD: pool "analytics" default_pool_size changed ${from} -> ${st.v} (config rev ${h.hex(7)})`; },
      (h, st) => () => { st.v ??= 0; const from = st.v; st.v += 1; return `pgbouncer[812]: LOG RELOAD: pool "reporting" reserve_pool_size changed ${from} -> ${st.v} (config rev ${h.hex(7)})`; },
    ],
    symptoms: [
      [5, (h, c) => () => `checkout-api level=error msg="db acquire timeout" pool=orders waited_ms=5000 path=/api/checkout trace_id=${h.hex(16)}`],
      [2, (h, c) => () => `pgbouncer[812]: WARNING pool "orders": ${h.int(30, 140)} clients waiting, server connections ${c.to}/${c.to} in use, longest wait ${h.int(5, 30)}.${h.int(0, 9)}s`],
      [2, (h) => () => `nginx-ingress [error] 31#31: *${h.int(100000, 999999)} upstream timed out (110: Connection timed out) while reading response header from upstream, client: 203.0.113.${h.int(2, 250)}, server: shop.example.com, request: "POST /api/checkout HTTP/1.1", upstream: "http://10.244.3.${h.int(10, 40)}:8080/api/checkout"`],
    ],
    decoy: (h, ctx) => {
      const pod = ctx.pods['checkout-api'][0];
      const key = `OOMKilling pod/${pod}`;
      return { key, component: 'k8s-event', render: () => `k8s-event Warning ${key} Memory cgroup out of memory: Killed process 1 (checkout-api) total-vm:2214556kB, anon-rss:1048576kB` };
    },
    exclude: ['db-reset', 'slow-query'],
    checks: {
      family: /pool "orders"[^\n]*(changed|->)/,
      symptom: /db acquire timeout|pool "orders": \d+ clients waiting|upstream timed out/,
    },
  },

  cert: {
    component: 'cert-manager',
    summary: (ctx) => `Checkout (POST /api/checkout) started failing with HTTP 502 at about ${fmt.hm(ctx.Ts)} UTC on ${fmt.day(ctx.Ts)}.`,
    status: 502,
    needle: (h) => {
      const order = h.int(1000, 9999);
      const key = `certificate default/payments-gateway-tls: renewal failed`;
      return {
        key,
        render: (t, ctx) =>
          `cert-manager ${fmt.klog('E', t)} controller.go:167] ${key}: ACME order ${order} invalid: DNS-01 challenge for pay.internal.example.com: NXDOMAIN; current certificate expires ${fmt.iso(ctx.expiry, 0)}; next attempt in 24h0m0s`,
      };
    },
    distractors: [
      (h, st) => (t) => { st.n = (st.n ?? -1) + 1; const name = ['shop-web-tls', 'grafana-tls', 'api-docs-tls', 'status-page-tls', 'admin-tls', 'search-tls'][st.n % 6]; return `cert-manager ${fmt.klog('I', t)} controller.go:212] certificate default/${name}: renewed, new certificate expires ${fmt.iso(new Date(t.getTime() + 90 * 864e5), 0)}`; },
      (h, st) => (t) => { st.at ??= new Date(t.getTime() + 15 * 864e5); return `cert-manager ${fmt.klog('I', t)} controller.go:198] certificate default/admin-tls: renewal scheduled for ${fmt.iso(st.at, 0)}`; },
    ],
    symptoms: [
      [5, (h) => (t, ctx) => `checkout-api level=error msg="payment authorize failed" upstream=payments-gateway err="x509: certificate has expired or is not yet valid: current time ${fmt.iso(t, 0)} is after ${fmt.iso(ctx.expiry, 0)}" trace_id=${h.hex(16)}`],
      [2, (h) => () => `nginx-ingress [error] 31#31: *${h.int(100000, 999999)} upstream prematurely closed connection while reading response header from upstream, client: 203.0.113.${h.int(2, 250)}, server: shop.example.com, request: "POST /api/checkout HTTP/1.1", upstream: "http://10.244.3.${h.int(10, 40)}:8080/api/checkout"`],
    ],
    decoy: (h) => {
      const key = `msg="circuit breaker opened" dependency=payments-gateway`;
      return { key, component: 'checkout-api', render: () => `checkout-api level=error ${key} consecutive_failures=50 window=30s` };
    },
    exclude: [],
    checks: {
      family: /payments-gateway-tls/,
      symptom: /certificate has expired|upstream prematurely closed/,
    },
  },

  hpa: {
    component: 'k8s-audit',
    summary: (ctx) => `Checkout (POST /api/checkout) started returning HTTP 503 at about ${fmt.hm(ctx.Ts)} UTC on ${fmt.day(ctx.Ts)}.`,
    status: 503,
    needle: (h) => {
      const from = h.pick([20, 24, 30]);
      const to = h.pick([2, 3]);
      const key = `name=checkout-api diff="spec.maxReplicas: ${from} -> ${to}"`;
      return { key, render: () => `k8s-audit user=deploy-bot verb=patch resource=horizontalpodautoscalers ns=shop ${key}`, ctx: { to } };
    },
    distractors: [
      (h, st) => () => { st.v ??= 10; const from = st.v; st.v += 2; return `k8s-audit user=deploy-bot verb=patch resource=horizontalpodautoscalers ns=shop name=search-api diff="spec.maxReplicas: ${from} -> ${st.v}"`; },
      (h, st) => () => { st.v ??= 3; const from = st.v; st.v += 1; return `k8s-audit user=deploy-bot verb=patch resource=deployments ns=shop name=worker diff="spec.replicas: ${from} -> ${st.v}"`; },
    ],
    symptoms: [
      [3, (h, c) => () => `k8s-event Warning ScalingLimited horizontalpodautoscaler/checkout-api the desired replica count (${h.int(9, 18)}) is more than the maximum replica count (${c.to})`],
      [5, (h) => () => `checkout-api level=warn msg="request queue full, shedding load" in_flight=512 queue=512 path=/api/checkout`],
    ],
    decoy: (h, ctx) => {
      const pod = ctx.pods['checkout-api'][1];
      const key = `BackOff pod/${pod}`;
      return { key, component: 'k8s-event', render: () => `k8s-event Warning ${key} Back-off restarting failed container checkout-api in pod ${pod} (exit code 137)` };
    },
    exclude: ['failed-scheduling'],
    checks: {
      family: /verb=patch[^\n]*name=checkout-api/,
      symptom: /ScalingLimited|request queue full/,
    },
  },

  redis: {
    component: 'config-agent',
    summary: (ctx) => `Cart and checkout started failing with HTTP 500 at about ${fmt.hm(ctx.Ts)} UTC on ${fmt.day(ctx.Ts)}.`,
    status: 500,
    needle: (h) => {
      const key = `maxmemory 4gb -> 64mb`;
      return { key, render: (t, ctx) => `config-agent level=info msg="applied redis-cache config rev ${nextRev(h, ctx, 'redis')}: ${key}, maxmemory-policy allkeys-lru -> noeviction" by=ops-bot` };
    },
    distractors: [
      (h, st) => (t, ctx) => { st.v ??= 10000; const from = st.v; st.v /= 2; return `config-agent level=info msg="applied redis-cache config rev ${nextRev(h, ctx, 'redis')}: slowlog-log-slower-than ${from} -> ${st.v}" by=ops-bot`; },
      (h, st) => (t, ctx) => { st.v ??= 60; const from = st.v; st.v *= 2; return `config-agent level=info msg="applied search-api config rev ${nextRev(h, ctx, 'search')}: cache_ttl ${from}s -> ${st.v}s" by=ops-bot`; },
    ],
    symptoms: [
      [4, (h) => () => `cart-api level=error msg="session write failed" err="OOM command not allowed when used memory > 'maxmemory'." session=s_${h.hex(12)}`],
      [3, (h) => () => `checkout-api level=error msg="cart load failed" err="session store: OOM command not allowed when used memory > 'maxmemory'." trace_id=${h.hex(16)}`],
    ],
    decoy: (h) => {
      const key = `msg="unhandled error, exiting" err="session store unavailable"`;
      return { key, component: 'cart-api', render: () => `cart-api level=fatal ${key} uptime=41h12m` };
    },
    exclude: ['redis-reset', 'redis-overcommit'],
    checks: {
      family: /maxmemory 4gb|maxmemory-policy/,
      symptom: /OOM command not allowed/,
    },
  },

  queue: {
    component: 'worker',
    summary: (ctx) => `Checkout (POST /api/checkout) started failing with HTTP 500 at about ${fmt.hm(ctx.Ts)} UTC on ${fmt.day(ctx.Ts)}.`,
    status: 500,
    needle: (h) => {
      const key = `msg="consumer paused by operator" queue=payment-confirmations`;
      return { key, render: () => `worker level=info ${key} consumers=0 requested_by=ops-bot` };
    },
    distractors: [
      (h, st) => () => { st.v ??= 50; const from = st.v; st.v *= 2; return `worker level=info msg="consumer prefetch changed" queue=email.send prefetch=${from} -> ${st.v}`; },
      (h, st) => () => { st.paused = !st.paused; return st.paused ? `worker level=info msg="consumer paused by operator" queue=report.daily consumers=0 requested_by=ops-bot` : `worker level=info msg="consumer resumed by operator" queue=report.daily consumers=2 requested_by=ops-bot`; },
    ],
    symptoms: [
      [5, (h) => () => `checkout-api level=error msg="publish failed" queue=payment-confirmations err="message rejected: queue length limit 200000 reached (x-overflow=reject-publish)" trace_id=${h.hex(16)}`],
      [2, (h) => () => `rabbitmq [warning] <0.${h.int(400, 900)}.0> queue 'payment-confirmations' in vhost 'shop': max length 200000 reached, rejecting publishes`],
    ],
    decoy: (h) => {
      const key = `memory resource limit alarm set on node rabbit@mq-0`;
      return { key, component: 'rabbitmq', render: () => `rabbitmq [warning] <0.512.0> ${key}. Publishers will be blocked until this alarm clears` };
    },
    exclude: [],
    checks: {
      family: /payment-confirmations[^\n]*(paused|consumers=0)|(paused|consumers=0)[^\n]*payment-confirmations/,
      symptom: /queue length limit|max length 200000 reached/,
    },
  },
};

export const SCENARIO_ORDER = ['pool', 'cert', 'hpa', 'redis', 'queue'];

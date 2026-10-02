import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createUsageMeter, resetMilliseconds, tokenUsage } from '../lib/usage.mjs';
import { collectResponse, startServer } from '../server.mjs';

const usage = { input_tokens: 120, output_tokens: 30, total_tokens: 150, input_tokens_details: { cached_tokens: 70 }, output_tokens_details: { reasoning_tokens: 10 } };
const response = (status = 'completed') => ({ status, usage, output: [{ type: 'message', content: [{ type: 'output_text', text: 'Respuesta' }] }] });
const wire = (value, type = 'response.completed') => 'data: ' + JSON.stringify({ type, response: value }) + '\n\n';
const events = (...values) => Readable.from(values.map(value => Buffer.from(value)));
test('usage includes cached input and reasoning once; missing values remain unknown', async () => {
  assert.deepEqual(tokenUsage(usage), { inputTokens: 120, outputTokens: 30, totalTokens: 150 });
  assert.equal(tokenUsage(null), null); assert.equal(tokenUsage({ input_tokens: 10 }), null);
  assert.deepEqual(tokenUsage({ input_tokens: 0, output_tokens: 0, total_tokens: 0 }), { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  const seen = [];
  const result = await collectResponse(events(wire(response()), wire(response())), u => seen.push(u));
  assert.equal(result.usage.totalTokens, 150); assert.equal(seen.length, 1);
  await assert.rejects(collectResponse(events(wire(response('incomplete'), 'response.incomplete')), u => seen.push(u)), err => err.status === 502);
  assert.equal(seen[1].totalTokens, 150, 'Incomplete responses still record reported charges');
  const failed = { ...response('failed'), error: { code: 'credit_balance_exhausted' } };
  await assert.rejects(collectResponse(events(wire(failed, 'response.failed'))), err => err.status === 402 && err.code === 'credit_balance_exhausted');
});

test('rate headers preserve zero, distinguish project limits and never fabricate a renewed balance', async () => {
  let now = Date.parse('2026-10-01T10:00:00Z');
  const meter = await createUsageMeter({ apiKey: 'test-key', model: 'test-model', now: () => now });
  meter.observeHeaders(new Headers()); assert.deepEqual(meter.snapshot().rateLimits, []);
  meter.observeHeaders(new Headers({ 'x-ratelimit-remaining-tokens': '500', 'x-ratelimit-limit-tokens': '1000', 'x-ratelimit-reset-tokens': '1m2.5s', 'x-ratelimit-remaining-project-tokens': '0', 'x-ratelimit-reset-project-tokens': '500ms' }));
  const initial = meter.snapshot();
  assert.equal(initial.rateLimits[0].remaining, 500); assert.equal(initial.rateLimits[0].expired, false);
  assert.equal(initial.rateLimits[1].remaining, 0); assert.equal(initial.rateLimits[1].limit, null);
  now += 63000;
  assert.equal(meter.snapshot().rateLimits[0].expired, true); assert.equal(meter.snapshot().rateLimits[0].remaining, 500);
  assert.equal(resetMilliseconds('1h2m3s4ms'), 3723004); assert.equal(resetMilliseconds('unknown'), null);
});

test('counters survive restarting and concurrent saves, excluding credentials; another key starts its own counter', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'appgrd-usage-')), file = join(dir, 'usage.json');
  t.after(async () => { await unlink(file); await rmdir(dir); });
  const config = { file, apiKey: 'private-test-key', model: 'test-model' };
  const meter = await createUsageMeter(config);
  meter.record(tokenUsage(usage)); meter.record(tokenUsage(usage)); meter.record(null);
  meter.exhausted({ code: 'insufficient_quota', message: 'Sin saldo' });
  await meter.flush();
  const restored = await createUsageMeter(config), snapshot = restored.snapshot();
  assert.equal(snapshot.totalTokens, 300); assert.equal(snapshot.calls, 3); assert.equal(snapshot.unreportedCalls, 1);
  assert.equal(snapshot.quota.state, 'exhausted'); assert.equal(snapshot.persistenceWarning, false);
  assert.ok(!JSON.stringify(snapshot).includes('fingerprint'));
  assert.ok(!(await readFile(file, 'utf8')).includes(config.apiKey));
  assert.equal((await createUsageMeter({ ...config, apiKey: 'other-test-key' })).snapshot().totalTokens, 0);
  restored.available(); await restored.flush();
  assert.equal((await createUsageMeter(config)).snapshot().quota.state, 'ok');
});

test('HTTP usage counts actual responses, keeps quota alerts through checks and clears them after recovery', async t => {
  let mode = 'success', providerCalls = 0;
  const server = await startServer(0, { env: { OPENAI_API_KEY: 'test-key' }, usageFile: null, fetchImpl: async url => {
    providerCalls++;
    if (url.includes('/models/')) return Response.json({ id: 'gpt-4.1-mini' });
    if (mode === 'quota') return Response.json({ error: { code: 'insufficient_quota' } }, { status: 429 });
    if (mode === 'rate') return Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429, headers: { 'x-ratelimit-remaining-tokens': '0' } });
    if (mode === 'invalid-quiz') return new Response(wire(response()), { status: 200 });
    return new Response(wire(response()), { headers: { 'Content-Type': 'text/event-stream', 'x-ratelimit-remaining-tokens': '850', 'x-ratelimit-limit-tokens': '1000', 'x-ratelimit-reset-tokens': '30s' } });
  } });
  t.after(() => new Promise(done => { server.close(done); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const data = { model: 'gpt-4.1-mini', context: { lessons: [{ title: 'Tema', text: 'Texto' }] }, messages: [{ role: 'user', content: 'Explica' }] };
  const post = (path, body) => fetch(origin + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const stats = async () => (await fetch(origin + '/api/usage')).json();
  assert.equal((await stats()).calls, 0); assert.equal(providerCalls, 0, 'Reading usage does not call OpenAI');
  assert.equal((await post('/api/tutor', data)).status, 200);
  assert.equal((await stats()).totalTokens, 150); assert.equal((await stats()).rateLimits[0].remaining, 850);
  mode = 'quota'; const denied = await post('/api/tutor', data);
  assert.equal(denied.status, 402); assert.equal((await denied.json()).code, 'insufficient_quota');
  assert.equal((await stats()).totalTokens, 150); assert.equal((await stats()).quota.state, 'exhausted');
  await post('/api/check', {}); assert.equal((await stats()).quota.state, 'exhausted', 'Model access does not prove remaining credit');
  mode = 'success'; await post('/api/tutor', data); assert.equal((await stats()).quota.state, 'ok');
  mode = 'rate'; await post('/api/tutor', data); assert.equal((await stats()).quota.state, 'ok'); assert.equal((await stats()).rateLimits[0].remaining, 0);
  mode = 'invalid-quiz'; assert.equal((await post('/api/tutor', { ...data, generate: true })).status, 502);
  assert.equal((await stats()).totalTokens, 450, 'Billed responses count even if generated quiz validation fails');
});

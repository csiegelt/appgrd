import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
export function tokenUsage(value) {
  if (!value || count(value.input_tokens) === null || count(value.output_tokens) === null || count(value.total_tokens) === null) return null;
  return { inputTokens: value.input_tokens, outputTokens: value.output_tokens, totalTokens: value.total_tokens };
}
export function resetMilliseconds(value) {
  if (typeof value !== 'string' || !/^(?:\d+(?:\.\d+)?(?:ms|s|m|h|d))+$/.test(value)) return null;
  const scale = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return [...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g)].reduce((sum, match) => sum + Number(match[1]) * scale[match[2]], 0);
}
function headerCount(headers, name) {
  const value = headers.get(name);
  return value !== null && /^\d+$/.test(value) ? count(Number(value)) : null;
}

// Only counters and provider status are persisted, never keys, prompts or responses.
export async function createUsageMeter({ file = null, apiKey = '', model, now = Date.now } = {}) {
  const fingerprint = createHash('sha256').update(apiKey).digest('hex');
  let state = { version: 1, fingerprint, since: new Date(now()).toISOString(), calls: 0, unreportedCalls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, lastCall: null, rateLimits: [], quota: { state: 'unknown' } };
  let persisted = true, queue = Promise.resolve();
  if (file) {
    try {
      const saved = JSON.parse(await readFile(file, 'utf8'));
      if (saved.version === 1 && saved.fingerprint === fingerprint && ['calls', 'unreportedCalls', 'inputTokens', 'outputTokens', 'totalTokens'].every(key => count(saved[key]) !== null) && Number.isFinite(Date.parse(saved.since))) {
        state = { ...state, ...saved };
        if (!Array.isArray(state.rateLimits)) state.rateLimits = [];
      }
    } catch (err) { if (err.code !== 'ENOENT') persisted = false; }
  }
  function save() {
    if (!file) return;
    const snapshot = JSON.stringify(state);
    queue = queue.then(async () => {
      try {
        await mkdir(dirname(file), { recursive: true });
        const temp = file + '.' + randomUUID() + '.tmp';
        await writeFile(temp, snapshot, { mode: 0o600 }); await rename(temp, file); persisted = true;
      } catch { persisted = false; }
    });
  }
  function observeHeaders(headers) {
    const observedAt = new Date(now()).toISOString();
    // A missing header means unknown, not zero and not the previous observation.
    state.rateLimits = ['tokens', 'project-tokens'].flatMap(kind => {
      const remaining = headerCount(headers, 'x-ratelimit-remaining-' + kind);
      if (remaining === null) return [];
      const reset = resetMilliseconds(headers.get('x-ratelimit-reset-' + kind));
      return [{ scope: kind === 'tokens' ? 'model' : 'project', model, remaining, limit: headerCount(headers, 'x-ratelimit-limit-' + kind), observedAt, resetAt: reset === null ? null : new Date(now() + reset).toISOString() }];
    });
    save();
  }
  function record(usage) {
    state.calls++;
    if (usage) {
      state.inputTokens += usage.inputTokens; state.outputTokens += usage.outputTokens; state.totalTokens += usage.totalTokens;
    } else state.unreportedCalls++;
    state.lastCall = { at: new Date(now()).toISOString(), model, usage };
    save();
  }
  function available() { state.quota = { state: 'ok', at: new Date(now()).toISOString() }; save(); }
  function exhausted(error) {
    state.quota = { state: 'exhausted', at: new Date(now()).toISOString(), code: error.code, message: error.message }; save();
  }
  function snapshot() {
    const { fingerprint: _private, version: _version, ...data } = state;
    return structuredClone({ ...data, model, persistenceWarning: !persisted, rateLimits: state.rateLimits.filter(rate => rate.model === model).map(rate => ({ ...rate, expired: rate.resetAt ? now() >= Date.parse(rate.resetAt) : null })) });
  }
  return { observeHeaders, record, available, exhausted, snapshot, flush: () => queue };
}

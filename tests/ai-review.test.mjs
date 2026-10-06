import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, sep } from 'node:path';
import { validateReview, streamValidator, execute, lock, safePath, assertNoSecrets, reviewerEnv, authSummary, assertRound, fingerprint, unchanged, watchReviewTree, git, deduplicateAddedFiles, legacyDiffContext } from '../scripts/ai/review-core.mjs';

const base = 'a'.repeat(40), head = 'b'.repeat(40);
const approved = () => ({ base_sha: base, head_sha: head, status: 'approved', findings: [], missing_evidence: [] });
const finding = { id: 'A-1', severity: 'high', file: 'scripts/example.mjs', location: '10', evidence: 'Destino alterable', suggested_fix: 'Validar destino' };
const init = { type: 'system', subtype: 'init', permissionMode: 'dontAsk', tools: [], mcp_servers: [], plugins: [] };
const result = () => ({ type: 'result', subtype: 'success', is_error: false, structured_output: approved() });

test('only the exact public Vercel catch-all path is allowed, never traversal', () => {
  assert.equal(safePath('api/[...path].mjs'), true);
  for (const path of ['../api/[...path].mjs', 'api/../server.mjs', 'api/[...secret].mjs', 'api/[...path].mjs/../secret.mjs']) assert.equal(safePath(path), false);
});

test('legacy UI context omits only unchanged surrounding code with full bounded patch and blob identities',()=>{
  const file={path:'js/estudio.js',content:'existing code'},diff='diff --git a/js/estudio.js b/js/estudio.js\nindex 123..456 100644\n--- a/js/estudio.js\n+++ b/js/estudio.js\n@@ -1 +1 @@\n-old\n+new\n';
  const context=legacyDiffContext(file,base,head,diff);assert.equal(context.base_blob,base);assert.equal(context.head_blob,head);assert.match(context.provided_as,/complete diff/);assert.equal(context.content,undefined);
  assert.throws(()=>legacyDiffContext({path:'lib/security.mjs'},base,head,diff));assert.throws(()=>legacyDiffContext(file,base,head,''));assert.throws(()=>legacyDiffContext(file,base,head,diff.replace('index 123..456 100644','new file mode 100644')));assert.throws(()=>legacyDiffContext(file,base,head,diff+'+extra\n'.repeat(101)));
});

test('new code appears once only when the complete diff exactly contains it',()=>{
  const files=[{path:'lib/new.mjs',content:'export const n=1;\n'},{path:'lib/old.mjs',content:'context'}];
  const diff='diff --git a/lib/new.mjs b/lib/new.mjs\nnew file mode 100644\n--- /dev/null\n+++ b/lib/new.mjs\n@@ -0,0 +1 @@\n+export const n=1;\n';
  assert.deepEqual(deduplicateAddedFiles(files,['lib/new.mjs'],diff),[{path:'lib/new.mjs',content_in_diff:true},files[1]]);
  assert.throws(()=>deduplicateAddedFiles(files,['lib/new.mjs'],''));
  assert.throws(()=>deduplicateAddedFiles(files,['lib/new.mjs'],diff.replace('n=1','n=2')));
  assert.deepEqual(deduplicateAddedFiles(files,[],diff),files);
  assert.throws(()=>assertNoSecrets(JSON.stringify({diff:diff+'+sb_secret_'+'x'.repeat(30),files:[]})));
});

test('schema rejects incomplete, mismatched, contradictory and malformed reviews', () => {
  assert.equal(validateReview(approved(), base, head).status, 'approved');
  for (const value of [null, {}, { ...approved(), head_sha: base }, { ...approved(), unexpected: true }, { ...approved(), findings: [finding] }, { ...approved(), missing_evidence: ['No tests'] }, { ...approved(), status: 'changes_requested' }, { ...approved(), status: 'blocked' }, { ...approved(), findings: [{ ...finding, severity: 'unknown' }] }]) assert.throws(() => validateReview(value, base, head));
  assert.doesNotThrow(() => validateReview({ ...approved(), status: 'changes_requested', findings: [finding] }, base, head));
  assert.doesNotThrow(() => validateReview({ ...approved(), status: 'blocked', missing_evidence: ['Falta contexto'] }, base, head));
});

test('stream requires a restricted init and successful complete structured result', () => {
  const good = streamValidator(base, head); good.line(JSON.stringify(init)); good.line(JSON.stringify(result())); assert.deepEqual(good.finish(), approved());
  for (const event of [{ ...init, tools: ['Bash'] }, { ...init, tools: undefined }, { ...init, mcp_servers: ['external'] }, { ...init, plugins: ['plugin'] }, { ...init, permissionMode: 'bypassPermissions' }, { type: 'system', subtype: 'hook_started' }, { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write' }] } }, result()]) {
    const validator = streamValidator(base, head); assert.throws(() => validator.line(JSON.stringify(event)));
  }
  const failed = streamValidator(base, head); failed.line(JSON.stringify(init)); assert.throws(() => failed.line(JSON.stringify({ ...result(), is_error: true })));
  const partial = streamValidator(base, head); partial.line(JSON.stringify(init)); assert.throws(() => partial.finish()); assert.throws(() => partial.line('not json'));
});

test('process failure, missing executable, timeout, abort and excessive output never approve', async () => {
  const failedLines=[];
  await assert.rejects(execute(process.execPath, ['-e', 'console.log("approved"); process.exit(1)'], {onLine: line=>failedLines.push(line)}), /código 1/);
  assert.deepEqual(failedLines,['approved']); // Failure diagnostics survive; the process still rejects.
  await assert.rejects(execute('appgrd-deliberately-missing-executable', []), /iniciar/);
  await assert.rejects(execute(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], { timeout: 100 }), /Timeout/);
  await assert.rejects(execute(process.execPath, ['-e', 'console.log("x".repeat(1000))'], { maxBytes: 20 }), /excesiva/);
  const controller = new AbortController();
  const running = execute(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], { signal: controller.signal }); controller.abort();
  await assert.rejects(running, /externos/);
});

test('only official logged in session qualifies; child env removes tokens and overrides case insensitively', () => {
  assert.deepEqual(authSummary({ loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', email: 'not-retained' }), { loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty' });
  for (const value of [null, {}, { loggedIn: false }, { loggedIn: true, authMethod: 'apiKey' }]) assert.throws(() => authSummary(value), /auth login/);
  const input = Object.freeze({ Path: 'kept', USERPROFILE: 'kept', AnThRoPiC_ApI_KeY: 'fake', CLAUDE_CONFIG_DIR: 'elsewhere', NODE_OPTIONS: 'unsafe', HTTPS_PROXY: 'elsewhere' });
  assert.deepEqual(reviewerEnv(input), { Path: 'kept', USERPROFILE: 'kept', DISABLE_AUTOUPDATER: '1', ENABLE_CLAUDEAI_MCP_SERVERS: 'false' }); assert.equal(input.CLAUDE_CONFIG_DIR, 'elsewhere');
});

test('paths and secret patterns block private inputs before any model call', () => {
  for (const path of ['.env', 'supabase/.env.local', '.local/evidence.json', '.claude/settings.json', 'datos/patient.json', '../other.md', 'C:/private.md', 'cert.key']) assert.equal(safePath(path), false, path);
  assert.equal(safePath('scripts/local/supabase-env.mjs'), true);
  assert.equal(safePath('scripts/local/acceptance.Dockerfile'), true);
  assert.equal(safePath('private.Dockerfile'), false);
  assert.equal(safePath('supabase/migrations/20261005000100_collaboration_schema.sql'), true);
  assert.doesNotThrow(() => assertNoSecrets('SUPABASE_DB_PORT=55999'));
  assert.throws(() => assertNoSecrets('sk-ant-' + 'x'.repeat(30)), /secreto/);
  assert.throws(() => assertNoSecrets('postgres' + '://example:fake@host/db'), /secreto/);
});

test('one writer and a maximum initial review plus three corrections', () => {
  const parent = resolve(tmpdir()); const dir = mkdtempSync(resolve(parent, 'appgrd-ai-lock-'));
  try {
    const release = lock(dir); assert.throws(() => lock(dir), /otra ejecución/); release(); lock(dir)();
    for (let count = 0; count < 4; count++) assert.doesNotThrow(() => assertRound({ base_sha: base, attempts: Array.from({ length: count }, () => ({ status: 'changes_requested' })) }, base, head));
    assert.throws(() => assertRound({ base_sha: base, attempts: [{}, {}, {}, {}] }, base, head), /Agotadas/);
    assert.throws(() => assertRound({ base_sha: head, attempts: [] }, base, head), /base/);
    assert.throws(() => assertRound({ base_sha: base, attempts: [{ head_sha: head, status: 'approved' }] }, base, head), /ya fue aprobado/);
  } finally { assert.ok(dir.startsWith(parent + sep)); rmSync(dir, { recursive: true, force: true }); }
});

test('fingerprints detect tracked edits, new files and HEAD changes; local logs are excluded', () => {
  const parent = resolve(tmpdir()); const dir = mkdtempSync(resolve(parent, 'appgrd-ai-git-'));
  const commit = () => { git(dir, ['add', '.']); git(dir, ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture']); };
  try {
    git(dir, ['init']); writeFileSync(resolve(dir, '.gitignore'), '.local/\n'); writeFileSync(resolve(dir, 'code.mjs'), 'original'); commit();
    const before = fingerprint(dir);
    mkdirSync(resolve(dir, '.local')); writeFileSync(resolve(dir, '.local/log.json'), '{}'); assert.ok(unchanged(before, fingerprint(dir)));
    writeFileSync(resolve(dir, 'code.mjs'), 'changed'); assert.equal(unchanged(before, fingerprint(dir)), false);
    writeFileSync(resolve(dir, 'new.mjs'), 'new'); assert.notEqual(before.content, fingerprint(dir).content);
    commit(); assert.notEqual(before.head, fingerprint(dir).head);
  } finally { assert.ok(dir.startsWith(parent + sep)); rmSync(dir, { recursive: true, force: true }); }
});

test('real watcher ignores Git index and local artifacts but detects external code and HEAD writes', async () => {
  const parent = resolve(tmpdir()); const dir = mkdtempSync(resolve(parent, 'appgrd-ai-watch-'));
  let watcher;
  const settle = () => new Promise(resolve => setTimeout(resolve, 180));
  try {
    git(dir, ['init']); writeFileSync(resolve(dir, '.gitignore'), '.local/\n'); writeFileSync(resolve(dir, 'code.mjs'), 'original');
    git(dir, ['add', '.']); git(dir, ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture']);
    mkdirSync(resolve(dir, '.local')); const events = [];
    watcher = watchReviewTree(dir, path => events.push(path));
    writeFileSync(resolve(dir, '.git/index.lock'), 'synthetic'); writeFileSync(resolve(dir, '.local/log.json'), '{}');
    await settle(); assert.deepEqual(events, []);
    writeFileSync(resolve(dir, 'code.mjs'), 'external edit'); await settle(); assert.ok(events.includes('code.mjs'));
    writeFileSync(resolve(dir, '.git/HEAD'), 'ref: refs/heads/changed\n'); await settle(); assert.ok(events.includes('.git/HEAD'));
  } finally { watcher?.close(); assert.ok(dir.startsWith(parent + sep)); rmSync(dir, { recursive: true, force: true }); }
});

import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, readlinkSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync, lstatSync, watch } from 'node:fs';
import { resolve } from 'node:path';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['base_sha', 'head_sha', 'status', 'findings', 'missing_evidence'],
  properties: {
    base_sha: { type: 'string', pattern: '^[a-f0-9]{40}$' }, head_sha: { type: 'string', pattern: '^[a-f0-9]{40}$' },
    status: { type: 'string', enum: ['approved', 'changes_requested', 'blocked'] },
    findings: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['id', 'severity', 'file', 'location', 'evidence', 'suggested_fix'],
      properties: Object.fromEntries(['id', 'severity', 'file', 'location', 'evidence', 'suggested_fix'].map(k => [k, k === 'severity' ? { type: 'string', enum: ['critical', 'high', 'medium', 'low'] } : { type: 'string', minLength: 1 }])) } },
    missing_evidence: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
};

export function validateReview(value, base, head) {
  const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join() === [...keys].sort().join();
  if (!exact(value, SCHEMA.required) || value.base_sha !== base || value.head_sha !== head || !/^[a-f0-9]{40}$/.test(base) || !/^[a-f0-9]{40}$/.test(head)) throw Error('Respuesta incompleta o hashes distintos de la entrega.');
  if (!SCHEMA.properties.status.enum.includes(value.status) || !Array.isArray(value.findings) || !Array.isArray(value.missing_evidence)) throw Error('Respuesta fuera del esquema.');
  const ids = new Set();
  for (const f of value.findings) {
    if (!exact(f, SCHEMA.properties.findings.items.required) || Object.values(f).some(v => typeof v !== 'string' || !v.trim()) || !['critical', 'high', 'medium', 'low'].includes(f.severity) || ids.has(f.id)) throw Error('Hallazgo inválido o duplicado.');
    ids.add(f.id);
  }
  if (value.missing_evidence.some(v => typeof v !== 'string' || !v.trim())) throw Error('Evidencia faltante inválida.');
  if (value.status === 'approved' && (value.findings.length || value.missing_evidence.length)) throw Error('Aprobación contradictoria.');
  if (value.status === 'changes_requested' && !value.findings.length) throw Error('Faltan los hallazgos que requieren corrección.');
  if (value.status === 'blocked' && !value.findings.length && !value.missing_evidence.length) throw Error('Bloqueo sin evidencia.');
  return value;
}

export function git(root, args) {
  return execFileSync('git', ['--no-pager', ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_PAGER: 'cat', GIT_EXTERNAL_DIFF: '' } }).trimEnd();
}
export function fingerprint(root) {
  const files = [...new Set(git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean))].sort();
  const entries = files.map(file => {
    try { const path = resolve(root, file); const stat = lstatSync(path); return [file, sha256(stat.isSymbolicLink() ? readlinkSync(path) : readFileSync(path)), stat.mtimeMs]; }
    catch (error) { if (error.code === 'ENOENT') return [file, 'missing', 0]; throw error; }
  });
  return { head: git(root, ['rev-parse', 'HEAD']), branch: git(root, ['branch', '--show-current']), status: git(root, ['status', '--porcelain=v1', '--untracked-files=all']), content: sha256(JSON.stringify(entries.map(([file, digest]) => [file, digest]))), observed: sha256(JSON.stringify(entries)) };
}
export function unchanged(before, after) { return JSON.stringify(before) === JSON.stringify(after); }
export function watchReviewTree(root, changed) {
  return watch(root, { recursive: true }, (_, name) => {
    if (!name) { changed('unknown'); return; }
    const path = String(name).replaceAll('\\', '/');
    // Windows also notifies parent directories when git refreshes its index.
    // HEAD/ref files themselves are watched; index metadata is covered by status.
    if (path === '.git') return;
    if (path.startsWith('.git/')) {
      if (path === '.git/HEAD' || path.startsWith('.git/refs/') || path === '.git/packed-refs') changed(path);
      return;
    }
    try { git(root, ['check-ignore', '-q', '--', path]); } catch { changed(path); }
  });
}
export function safePath(file) {
  return typeof file === 'string' && (!file.includes('..') || file === 'api/[...path].mjs') && !file.includes('\\') && !file.startsWith('/') && !file.includes(':') &&
    !/(^|\/)(\.env[^/]*|\.git|\.local|\.claude|\.aws|node_modules|datos|credentials?)(\/|$)/i.test(file) &&
    !/\.(pem|key|pfx|csv|xlsx|pdf|zip|sqlite|db)$/i.test(file) && (/\.(mjs|cjs|js|json|md|toml|html|css|sql)$/.test(file) || file==='scripts/local/acceptance.Dockerfile');
}
export function assertNoSecrets(text) {
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-ant-|sk-proj-|sb_secret_)[A-Za-z0-9_-]{16,}|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.|postgres(?:ql)?:\/\/[^\s:'"]+:[^\s@'"]+@/i.test(text)) throw Error('Paquete rechazado por posible secreto. Revisar localmente; no se envió.');
}

// Reviewed legacy UI can be represented by its complete patch. New files and
// deletions never qualify; only unchanged surrounding context may be omitted.
export function legacyDiffContext(file,baseBlob,headBlob,diff){
  if(!['js/estudio.js','index.html'].includes(file.path)||!/^[a-f0-9]{40}$/.test(baseBlob)||!/^[a-f0-9]{40}$/.test(headBlob))throw Error('Invalid legacy diff context');
  const section=diff.split(/(?=^diff --git )/m).find(s=>s.startsWith(`diff --git a/${file.path} b/${file.path}\n`));
  if(!section||/^(new file|deleted file|rename from)/m.test(section)||!section.includes('\n+++ b/'+file.path+'\n')||section.split('\n').filter(l=>/^[+-]/.test(l)&&!/^---|^\+\+\+/.test(l)).length>100)throw Error('Legacy patch must be complete and bounded');
  return {path:file.path,base_blob:baseBlob,head_blob:headBlob,provided_as:'complete diff above; unchanged legacy context omitted'};
}

// A new file is already complete in the diff. Verify that copy before omitting
// its duplicate context; never truncate code to fit the existing packet limit.
export function deduplicateAddedFiles(files, addedPaths, diff) {
  const added=new Set(addedPaths),sections=diff.split(/(?=^diff --git )/m);
  return files.map(file=>{
    if(!added.has(file.path))return file;
    const section=sections.find(s=>s.includes('\n+++ b/'+file.path+'\n'));
    if(!section || !/^new file mode 100(?:644|755)$/m.test(section))throw Error('Falta el diff completo del archivo nuevo.');
    const reconstructed=section.split('\n').filter(line=>line.startsWith('+')&&!line.startsWith('+++')).map(line=>line.slice(1)).join('\n');
    if(reconstructed.trimEnd()!==file.content.trimEnd())throw Error('El diff no contiene el archivo nuevo completo.');
    return {path:file.path,content_in_diff:true};
  });
}
export function lock(directory) {
  mkdirSync(directory, { recursive: true });
  const path = resolve(directory, 'writer.lock');
  let fd;
  try { fd = openSync(path, 'wx'); } catch { throw Error('Hay otra ejecución o un lock pendiente. No se borra automáticamente: comprobar primero el PID.'); }
  writeFileSync(fd, JSON.stringify({ pid: process.pid, started: new Date().toISOString() })); closeSync(fd);
  return () => unlinkSync(path);
}
export function save(path, value) { writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); }

// No shell interpolation. Timeout/overflow/errors reject, after killing the
// child tree on Windows. stdout is never treated as approval after failure.
export function execute(bin, args, { cwd, env, input = '', timeout = 600000, onLine, signal, maxBytes = 4 * 1024 * 1024 } = {}) {
  return new Promise((done, fail) => {
    if (signal?.aborted) { fail(Error('Revisión invalidada por cambios externos.')); return; }
    const child = spawn(bin, args, { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', errors = '', pending = '', failure;
    const stop = reason => {
      if (failure) return; failure = reason;
      if (child.pid && process.platform === 'win32') {
        try { execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 10000 }); } catch { child.kill(); }
      } else child.kill('SIGKILL');
    };
    const timer = setTimeout(() => stop(Error('Timeout del proceso; revisión bloqueada.')), timeout);
    const abort = () => stop(Error('Revisión invalidada por cambios externos.'));
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); fail(Error('No se pudo iniciar el proceso; comprobar instalación/acceso.')); });
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      output += chunk; pending += chunk;
      if (output.length > maxBytes) { stop(Error('Salida excesiva; revisión incompleta.')); return; }
      let index;
      while ((index = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, index); pending = pending.slice(index + 1);
        if (onLine && line.trim()) try { onLine(line); } catch (error) { stop(error); }
      }
    });
    child.stderr.on('data', chunk => { errors = (errors + chunk).slice(-16000); });
    child.stdin.on('error', () => {}); child.stdin.end(input);
    child.on('close', code => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (!failure && pending.trim() && onLine) try { onLine(pending); } catch (error) { failure = error; }
      if (failure) fail(failure);
      else if (code !== 0) fail(Error(`Proceso finalizó con código ${code}; no es una aprobación.`));
      else done({ output, errors });
    });
  });
}

export function streamValidator(base, head) {
  let initialized = false, result;
  return {
    line(text) {
      const event = JSON.parse(text);
      if (event.type === 'system' && event.subtype === 'init') {
        if (initialized || event.permissionMode !== 'dontAsk' || !Array.isArray(event.tools) || event.tools.some(t => t !== 'StructuredOutput') || !Array.isArray(event.mcp_servers) || event.mcp_servers.length || event.plugins?.length) throw Error('La sesión cargó herramientas, conexiones o permisos inesperados.');
        initialized = true;
      }
      if (/hook/i.test(event.subtype || '')) throw Error('Se observó un hook; revisión invalidada.');
      for (const part of event.message?.content || []) if (part.type === 'tool_use' && part.name !== 'StructuredOutput') throw Error('El revisor intentó usar una herramienta operativa.');
      if (event.type === 'result') {
        if (!initialized || result || event.is_error !== false || event.subtype !== 'success') throw Error('Claude no completó correctamente la revisión.');
        result = validateReview(event.structured_output, base, head);
      }
    },
    finish() { if (!initialized || !result) throw Error('Respuesta incompleta de Claude.'); return result; },
  };
}

// Preserve the official user's OAuth session location, never tokens or CLI overrides.
export function reviewerEnv(inherited = process.env) {
  const allowed = new Set('path systemroot windir comspec pathext temp tmp userprofile appdata localappdata homedrive homepath home programfiles programfiles(x86) programw6432 systemdrive'.split(' '));
  return { ...Object.fromEntries(Object.entries(inherited).filter(([key]) => allowed.has(key.toLowerCase()))), DISABLE_AUTOUPDATER: '1', ENABLE_CLAUDEAI_MCP_SERVERS: 'false' };
}
export function authSummary(value) {
  if (value?.loggedIn !== true || value.authMethod !== 'claude.ai' || value.apiProvider !== 'firstParty') throw Error('Falta sesión Claude oficial: ejecutar claude auth login y volver a npm run ai -- check.');
  return { loggedIn: true, authMethod: value.authMethod, apiProvider: value.apiProvider };
}
export function assertRound(state, base, head) {
  if (state.base_sha !== base || !Array.isArray(state.attempts)) throw Error('La base de la tarea cambió; no reiniciar el presupuesto silenciosamente.');
  if (state.attempts.length >= 4) throw Error('Agotadas la revisión inicial y tres rondas de corrección; entregar bloqueo con evidencia.');
  if (state.attempts.some(a => a.head_sha === head && a.status === 'approved')) throw Error('Este HEAD ya fue aprobado; no reabrir sin evidencia nueva.');
}

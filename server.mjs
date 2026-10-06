// Frontend and OpenAI API gateway. Credentials are read only by the server.
import { createServer } from 'node:http';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PublicError, apiError, QUOTA_CODES } from './lib/errors.mjs';
import { collectResponse, tutorPayload, validateGeneratedQuestions } from './lib/tutor.mjs';
import { createUsageMeter } from './lib/usage.mjs';
import { validateGeneratedCase } from './lib/cases.mjs';
import { validateGeneratedMaterial } from './lib/material.mjs';
import { sessionTokens } from './lib/session-token.mjs';
import { validateGeneratedExam, examReviewPayload, examSize } from './lib/exam.mjs';
export { collectResponse, tutorPayload } from './lib/tutor.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const RESOURCE = 'https://api.openai.com/v1';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.csv': 'text/csv; charset=utf-8', '.pdf': 'application/pdf', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const digest = value => createHash('sha256').update(value).digest();
function json(res, code, data) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
async function readJSON(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new PublicError('Formato de solicitud inválido.', 415);
  let bytes = 0, data = '';
  // Vercel can parse the body before invoking a Node function. Local HTTP uses the stream.
  if (req.body !== undefined) {
    data = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(data) > 300000) throw new PublicError('Divide el material en temas más pequeños.', 413);
  } else for await (const chunk of req) { bytes += chunk.length; if (bytes > 300000) throw new PublicError('Divide el material en temas más pequeños.', 413); data += chunk; }
  try { const parsed = JSON.parse(data); if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw Error(); return parsed; }
  catch { throw new PublicError('Solicitud JSON inválida.'); }
}

export function serverConfig(env = process.env) {
  const host = env.HOST || '127.0.0.1', apiKey = (env.OPENAI_API_KEY || '').trim(), model = (env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
  const password = env.APP_PASSWORD || '';
  if (!['127.0.0.1', '0.0.0.0'].includes(host)) throw Error('HOST debe ser 127.0.0.1 (local) o 0.0.0.0 (hosting).');
  if (!/^[\w.:-]{1,120}$/.test(model)) throw Error('OPENAI_MODEL no es válido.');
  let origin = '';
  const vercel = env.VERCEL === '1';
  const deploymentHost = env.VERCEL_ENV === 'preview' ? env.VERCEL_URL : env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const configuredOrigin = env.APP_ORIGIN || (vercel && deploymentHost ? 'https://' + deploymentHost : '');
  if (configuredOrigin) {
    let url; try { url = new URL(configuredOrigin); } catch { throw Error('APP_ORIGIN debe ser una URL HTTPS válida, sin rutas.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('APP_ORIGIN debe ser la dirección de la app, sin rutas ni credenciales.');
    origin = url.origin;
  }
  const publicAddress = vercel || host === '0.0.0.0' || (origin && !['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
  if (publicAddress && !origin.startsWith('https://')) throw Error('Para publicar configura APP_ORIGIN con la dirección HTTPS del portal.');
  // The shared token counter reveals everyone's activity, so public deployments hide it unless enabled.
  const showUsage = env.APP_SHOW_USAGE === '1' || !publicAddress;
  return { host, apiKey, model, password, origin, vercel, showUsage };
}

export async function createApp({ env = process.env, fetchImpl = fetch, usageFile = env.VERCEL === '1' ? null : resolve(ROOT, '.local', 'api-usage.json') } = {}) {
  const config = serverConfig(env), sessions = new Map();
  const meter = await createUsageMeter({ file: usageFile, apiKey: config.apiKey, model: config.model });
  const tokens = config.vercel && config.password ? sessionTokens({ secret: config.password, origin: config.origin }) : null;
  const revoked = new Map();
  let active = 0;
  const minute = () => ({ start: Date.now(), count: 0 });
  let calls = minute(), logins = minute();
  const configured = !!config.apiKey;
  const models = [{ slug: config.model, display_name: config.model }];
  const cookie = (id, maxAge = 28800) => `appgrd-session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${config.origin.startsWith('https://') ? '; Secure' : ''}`;
  function session(req, res) {
    const now = Date.now();
    for (const [id, item] of sessions) if (now >= item.expires) sessions.delete(id);
    for (const [id, expires] of revoked) if (now >= expires) revoked.delete(id);
    const raw = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('appgrd-session='))?.slice(15);
    const signed = tokens?.verify(raw), id = signed?.id || raw;
    let s = id && sessions.get(id);
    if (tokens && (!signed || revoked.has(id)) && s?.authorized) s = null;
    if (!s && signed && !revoked.has(id)) {
      if (sessions.size >= 1000) throw new PublicError('Hay demasiadas sesiones abiertas. Intenta más tarde.', 503);
      s = { ...signed, authorized: true, busy: false }; sessions.set(id, s);
    }
    if (!s) {
      if (sessions.size >= 1000) throw new PublicError('Hay demasiadas sesiones abiertas. Intenta más tarde.', 503);
      const newId = randomBytes(32).toString('base64url');
      s = { id: newId, expires: Date.now() + 8 * 3600000, authorized: !config.password, busy: false };
      sessions.set(newId, s); res.setHeader('Set-Cookie', cookie(newId));
    }
    return s;
  }
  function requireAccess(s) {
    if (!s.authorized) throw new PublicError('Ingresa la contraseña de acceso al tutor.', 401);
    if (!configured) throw new PublicError('Falta OPENAI_API_KEY en el servidor. Agrégala en .env o en las variables del hosting y reinicia la app.', 503);
  }
  async function openAI(path, options = {}, web = false, timeout = path === '/responses' ? 180000 : 30000) {
    const response = await fetchImpl(RESOURCE + path, { ...options, headers: { ...options.headers, Authorization: 'Bearer ' + config.apiKey }, signal: AbortSignal.timeout(timeout) });
    if (path === '/responses') meter.observeHeaders(response.headers);
    if (!response.ok) throw await apiError(response, web);
    return response;
  }
  const handler = async (req, res) => {
    const localPort = req.socket?.localPort;
    const origin = config.origin || `http://127.0.0.1:${localPort}`;
    const allowedHosts = new Set(config.origin ? [new URL(origin).host] : [`127.0.0.1:${localPort}`, `localhost:${localPort}`]);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    if (!allowedHosts.has(req.headers.host)) { json(res, 403, { error: 'Abre la app en ' + origin }); return; }
    const requestOrigin = config.origin || `http://${req.headers.host}`;
    if (req.method === 'POST' && req.headers.origin !== requestOrigin) { json(res, 403, { error: 'Origen no autorizado.' }); return; }
    try {
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/api/')) {
        const s = session(req, res);
        if (url.pathname === '/api/session' && req.method === 'GET') {
          json(res, 200, { available: true, provider: 'openai-api', configured, connected: configured && s.authorized, authRequired: !s.authorized, protected: !!config.password, models: s.authorized && configured ? models : [] }); return;
        }
        if (url.pathname === '/api/usage' && req.method === 'GET') {
          if (!config.showUsage) throw new PublicError('El contador de consumo no se muestra en esta publicación.', 404, 'USAGE_HIDDEN');
          if (!s.authorized) throw new PublicError('Ingresa al tutor para consultar el consumo de la API.', 401);
          json(res, 200, { configured, ...meter.snapshot(), ...(config.vercel ? { scope: 'instance', persistenceWarning: true } : {}) }); return;
        }
        if (url.pathname === '/api/login' && req.method === 'POST') {
          const data = await readJSON(req);
          if (Date.now() - logins.start >= 60000) logins = minute();
          if (logins.count >= 10) throw new PublicError('Demasiados intentos. Espera un minuto antes de ingresar nuevamente.', 429);
          if (typeof data.password !== 'string' || data.password.length > 1000 || !timingSafeEqual(digest(data.password), digest(config.password))) { logins.count++; throw new PublicError('La contraseña de acceso no es correcta.', 401); }
          if (tokens && s.authorized) revoked.set(s.id, s.expires);
          sessions.delete(s.id); s.id = randomBytes(32).toString('base64url'); s.authorized = true; s.expires = Date.now() + 8 * 3600000;
          sessions.set(s.id, s); res.setHeader('Set-Cookie', cookie(tokens ? tokens.issue(s) : s.id)); json(res, 200, { ok: true }); return;
        }
        if (url.pathname === '/api/logout' && req.method === 'POST') {
          await readJSON(req); if (tokens && s.authorized) revoked.set(s.id, s.expires); s.authorized = false; sessions.delete(s.id); res.setHeader('Set-Cookie', cookie('', 0)); json(res, 200, { ok: true }); return;
        }
        if (url.pathname === '/api/check' && req.method === 'POST') {
          await readJSON(req); requireAccess(s);
          const response = await openAI('/models/' + encodeURIComponent(config.model)); await response.body?.cancel();
          json(res, 200, { ok: true, message: 'Clave y acceso al modelo verificados. Envía una consulta para comprobar la generación y el saldo disponible.' }); return;
        }
        if (url.pathname === '/api/tutor' && req.method === 'POST') {
          const data = await readJSON(req); requireAccess(s);
          const payload = tutorPayload(data, models);
          if (s.busy || active >= 2) throw new PublicError('El tutor está atendiendo otra consulta. Espera un momento.', 429);
          if (Date.now() - calls.start >= 60000) calls = minute();
          if (calls.count >= 20) throw new PublicError('Se alcanzó el límite de 20 consultas por minuto de esta app. Espera un momento.', 429);
          s.busy = true; active++; calls.count++;
          let accepted = false, recorded = false;
          const deadline = Date.now() + 210000;
          let result;
          try {
            const response = await openAI('/responses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, !!payload.tools);
            accepted = true;
            result = await collectResponse(response.body, usage => { recorded = true; meter.record(usage); });
            if (data.generateExam) {
              let totalUsage = result.usage;
              const size = examSize(data.examSize);
              const review = examReviewPayload(payload, result.text, size, data.context.lessons.length);
              // One bounded correction, only for invalid exam content. Never retry quota,
              // authentication or transport errors, and never publish an unreviewed draft.
              for (let attempt = 0; attempt < 2; attempt++) {
                const remaining = deadline - Date.now();
                if (remaining <= 0) throw new DOMException('Exam deadline exceeded', 'TimeoutError');
                accepted = false; recorded = false;
                const checked = await openAI('/responses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review) }, false, Math.min(180000, remaining));
                accepted = true;
                result = await collectResponse(checked.body, usage => { recorded = true; meter.record(usage); });
                totalUsage = totalUsage && result.usage ? Object.fromEntries([...new Set([...Object.keys(totalUsage), ...Object.keys(result.usage)])].map(key => [key, (totalUsage[key] || 0) + (result.usage[key] || 0)])) : null;
                result.usage = totalUsage;
                try { result.exam = validateGeneratedExam(result.text, data.context.lessons, size); break; }
                catch (err) {
                  if (err.code !== 'EXAM_INVALID' || attempt > 0 || deadline - Date.now() < 10000) throw err;
                  review.input.push({ role: 'user', content: 'La versión revisada no pasó la validación: ' + err.message + ' Revisa de nuevo los enunciados originales y entrega la prueba completa corregida, respetando el plan y el esquema.' });
                }
              }
              delete result.text;
            }
            meter.available();
            if (data.generate) result.text = validateGeneratedQuestions(result.text, data.context.lessons);
            if (data.generateCase) { result.case = validateGeneratedCase(result.text, data.context.lessons, data.avoidCases || []); delete result.text; }
            if (data.generateMaterial) { result.material = validateGeneratedMaterial(result.text, data.context.lessons); delete result.text; }
            await meter.flush();
          } catch (err) {
            if (QUOTA_CODES.has(err.code)) meter.exhausted(err);
            throw err;
          } finally {
            if (accepted && !recorded) meter.record(null);
            s.busy = false; active--;
            await meter.flush();
          }
          json(res, 200, result);
          return;
        }
        json(res, 404, { error: 'Ruta no disponible.' }); return;
      }
      if (req.method !== 'GET') throw new PublicError('Método no admitido.', 405);
      const path = decodeURIComponent(url.pathname);
      if (!(path === '/' || path === '/index.html' || /^\/(js|css|manual|plantillas)\/[\w/.-]+$/.test(path))) throw new PublicError('Archivo no disponible.', 404);
      const file = resolve(ROOT, '.' + (path === '/' ? '/index.html' : path)), actual = await realpath(file);
      if (!actual.startsWith(ROOT + sep) || !mime[extname(file)]) throw new PublicError('Archivo no disponible.', 404);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] }); res.end(await readFile(actual));
    } catch (err) {
      const timeout = ['TimeoutError', 'AbortError'].includes(err.name);
      const error = err instanceof PublicError ? err.message : err.code === 'ENOENT' ? 'Archivo no encontrado.' : timeout ? 'La API tardó demasiado en responder. Inténtalo nuevamente con un tema más pequeño.' : 'No se pudo completar la operación. Verifica tu conexión y vuelve a intentar.';
      if (!res.headersSent) json(res, err.status || (err.code === 'ENOENT' ? 404 : timeout ? 504 : 500), { error, ...(err instanceof PublicError && err.code ? { code: err.code } : {}) }); else res.end();
    }
  };
  return { handler, config };
}

export async function startServer(port = Number(process.env.PORT || 8787), options = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('PORT no es válido.');
  const { handler, config } = await createApp(options);
  const server = createServer(handler);
  try { await new Promise((done, fail) => { server.once('error', fail); server.listen(port, config.host, done); }); }
  catch (err) { server.close(); throw err; }
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { loadEnvFile(resolve(ROOT, '.env')); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  try {
    const server = await startServer();
    console.log('appGRD: ' + (process.env.APP_ORIGIN || 'http://127.0.0.1:' + server.address().port));
    console.log(process.env.OPENAI_API_KEY?.trim() ? 'Tutor: API de OpenAI configurada.' : 'Tutor pendiente: configura OPENAI_API_KEY en .env y reinicia el servidor.');
  } catch (err) {
    console.error(err.code === 'EADDRINUSE' ? 'El puerto está ocupado. Detén la instancia anterior con Ctrl+C antes de iniciar esta versión.' : err.message);
    process.exitCode = 1;
  }
}

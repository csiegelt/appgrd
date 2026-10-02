import { createApp, serverConfig } from '../server.mjs';

export function createVercelHandler({ env = process.env, fetchImpl = fetch } = {}) {
  const settings = { ...env, VERCEL: '1' };
  let app;
  return async function handler(req, res) {
    let setupError;
    try { serverConfig(settings); }
    catch (error) { setupError = error.message; }
    if (setupError) {
      const session = req.method === 'GET' && req.url.split('?')[0] === '/api/session';
      res.writeHead(session ? 200 : 503, {
        'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'
      });
      res.end(JSON.stringify(session ? {
        available: true, provider: 'openai-api', configured: !!settings.OPENAI_API_KEY?.trim(),
        connected: false, authRequired: true, protected: true, models: [], setupError
      } : { error: setupError, code: 'APP_CONFIGURATION' }));
      return;
    }
    // Reuse a warm instance; no listening socket and no writes into Vercel's deployment directory.
    app ||= createApp({ env: settings, fetchImpl, usageFile: null });
    return (await app).handler(req, res);
  };
}

export default createVercelHandler();

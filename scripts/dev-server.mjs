// Local dev server: runs the SAME handler files that Vercel deploys (api/*.js),
// plus serves public/. Uses in-memory storage when no Blob token is reachable,
// so the full flow can be tested locally.
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Enable in-memory fallback only when there is no usable token.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  process.env.LOCAL_STORAGE_FALLBACK = '1';
}
if (!process.env.CRON_SECRET) process.env.CRON_SECRET = 'dev-cron-secret';

const handlers = {
  paste: require(path.join(root, 'api', 'paste.js')),
  pasteId: require(path.join(root, 'api', 'paste', '[id].js')),
  view: require(path.join(root, 'api', 'view.js')),
  raw: require(path.join(root, 'api', 'raw.js')),
  health: require(path.join(root, 'api', 'health.js')),
  cleanup: require(path.join(root, 'api', 'cleanup.js')),
};

function withQuery(req, extra) {
  req.query = { ...Object.fromEntries(new URL(req.url, 'http://localhost').searchParams), ...extra };
  return req;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    let m;
    if (p === '/' && req.method === 'GET') {
      const html = await readFile(path.join(root, 'public', 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (p === '/api/health') return await handlers.health(withQuery(req), res);
    if (p === '/api/paste' && req.method === 'POST') return await handlers.paste(withQuery(req), res);
    if ((m = p.match(/^\/api\/paste\/([^/]+)$/)) && req.method === 'GET')
      return await handlers.pasteId(withQuery(req, { id: m[1] }), res);
    if (p === '/api/view') return await handlers.view(withQuery(req), res);
    if (p === '/api/raw') return await handlers.raw(withQuery(req), res);
    if (p === '/api/cleanup') return await handlers.cleanup(withQuery(req), res);
    if ((m = p.match(/^\/p\/([^/]+)$/))) return await handlers.view(withQuery(req, { id: m[1] }), res);
    if ((m = p.match(/^\/raw\/([^/]+)$/))) return await handlers.raw(withQuery(req, { id: m[1] }), res);

    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  } catch (e) {
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal error' }));
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`Minimal Paste dev server on http://0.0.0.0:${port}`);
  console.log(
    process.env.LOCAL_STORAGE_FALLBACK === '1'
      ? 'Storage: in-memory LOCAL MODE (no BLOB_READ_WRITE_TOKEN set)'
      : 'Storage: Vercel Blob (token found)'
  );
});

// GET /api/raw?id=:id  (also routed as /raw/:id) — raw paste content as text/plain.
// User content is never executed: served as text/plain with nosniff.
'use strict';

const { isValidPasteId, BASE_SECURITY_HEADERS } = require('../lib/http');
const storage = require('../lib/storage');

module.exports = async function handler(req, res) {
  const id = (req.query && req.query.id) || '';
  if (!isValidPasteId(id)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', ...BASE_SECURITY_HEADERS });
    return res.end('Paste not found.');
  }

  let paste;
  try {
    paste = await storage.getPaste(id);
  } catch (e) {
    const status = e.statusCode || 500;
    res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', ...BASE_SECURITY_HEADERS });
    return res.end(
      e.code === 'STORAGE_NOT_CONFIGURED' ? 'Storage is not configured.' : 'Could not load paste.'
    );
  }

  if (!paste || Date.parse(paste.expiresAt) <= Date.now()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', ...BASE_SECURITY_HEADERS });
    return res.end('Paste not found or expired.');
  }

  res.writeHead(200, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...BASE_SECURITY_HEADERS,
  });
  return res.end(paste.content);
};

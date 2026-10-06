// GET /api/paste/:id — paste data as JSON
'use strict';

const { sendJson, isValidPasteId } = require('../../lib/http');
const storage = require('../../lib/storage');

module.exports = async function handler(req, res, id) {
  // Vercel passes dynamic segments as req.query.id
  const pasteId = id || (req.query && req.query.id);

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  if (!isValidPasteId(pasteId)) {
    return sendJson(res, 404, { error: 'Paste not found.' });
  }

  let paste;
  try {
    paste = await storage.getPaste(pasteId);
  } catch (e) {
    const status = e.statusCode || 500;
    const message =
      e.code === 'STORAGE_NOT_CONFIGURED' || status === 503
        ? e.message
        : 'Paste could not be loaded. Please try again.';
    return sendJson(res, status, { error: message });
  }

  // Lazy expiration: never serve an expired paste, even if cleanup has not run yet.
  if (!paste || Date.parse(paste.expiresAt) <= Date.now()) {
    return sendJson(res, 404, { error: 'Paste not found or expired.' });
  }

  return sendJson(res, 200, {
    id: paste.id,
    content: paste.content,
    createdAt: paste.createdAt,
    expiresAt: paste.expiresAt,
  });
};

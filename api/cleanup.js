// GET /api/cleanup — scheduled cleanup of expired pastes.
// Called by Vercel Cron (vercel.json) or the GitHub Actions workflow.
// Protected by CRON_SECRET: the caller must send "Authorization: Bearer <CRON_SECRET>".
'use strict';

const { sendJson } = require('../lib/http');
const storage = require('../lib/storage');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  const expected = process.env.CRON_SECRET;
  const isLocalDev = process.env.LOCAL_STORAGE_FALLBACK === '1';
  const auth = req.headers['authorization'];

  if (!isLocalDev) {
    if (!expected) return sendJson(res, 500, { error: 'Cleanup is not configured.' });
    if (auth !== `Bearer ${expected}`) return sendJson(res, 401, { error: 'Unauthorized.' });
  }

  const now = Date.now();
  let checked = 0;
  let deleted = 0;

  try {
    const blobs = await storage.listPasteKeys();
    const expiredKeys = [];

    for (const blob of blobs) {
      checked += 1;
      // Primary source: metadata written at creation time.
      let expiresAt = blob.metadata && blob.metadata.expiresAt;

      // Fallback: fetch the object if metadata is missing (older writes).
      if (!expiresAt && !storage.localFallbackEnabled()) {
        try {
          const sdk = require('@vercel/blob');
          const content = JSON.parse(await (await sdk.get(blob.url)).text());
          expiresAt = content.expiresAt;
        } catch {
          // Unreadable object -> treat as expired so it gets cleaned up.
          expiresAt = new Date(0).toISOString();
        }
      }

      if (expiresAt && Date.parse(expiresAt) <= now) expiredKeys.push(blob.pathname || blob.url);
    }

    await storage.deletePasteKeys(expiredKeys);
    deleted = expiredKeys.length;
  } catch (e) {
    const status = e.statusCode || 500;
    return sendJson(res, status, {
      error:
        e.code === 'STORAGE_NOT_CONFIGURED'
          ? e.message
          : 'Cleanup failed. Please try again.',
    });
  }

  return sendJson(res, 200, { status: 'ok', checked, deleted });
};

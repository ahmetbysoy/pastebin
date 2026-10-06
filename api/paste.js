// POST /api/paste  — create a paste
'use strict';

const crypto = require('crypto');
const { sendJson, readBody, clientIp, MAX_BODY_BYTES } = require('../lib/http');
const { rateLimit } = require('../lib/ratelimit');
const storage = require('../lib/storage');

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function newPasteId() {
  // 9 random bytes -> 12 URL-safe base64 chars (~72 bits of entropy).
  return crypto.randomBytes(9).toString('base64url');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' }, { allow: 'POST' });
  }

  // Minimum rate limit: 5 creations per IP per 10 minutes.
  const limit = rateLimit(clientIp(req));
  if (!limit.allowed) {
    return sendJson(
      res,
      429,
      { error: 'Too many requests. Please slow down.' },
      { 'retry-after': String(limit.retryAfterSec) }
    );
  }

  let raw;
  try {
    raw = await readBody(req, MAX_BODY_BYTES + 65536); // small slack for JSON overhead
  } catch (e) {
    if (e.statusCode === 413) return sendJson(res, 413, { error: 'Paste is too large. Limit is 5 MB.' });
    return sendJson(res, 400, { error: 'Could not read request.' });
  }

  let content;
  try {
    const parsed = JSON.parse(raw.toString('utf8'));
    content = parsed.content;
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body.' });
  }

  if (typeof content !== 'string') {
    return sendJson(res, 400, { error: 'Content must be a string.' });
  }
  if (content.trim().length === 0) {
    return sendJson(res, 400, { error: 'Paste cannot be empty.' });
  }

  // Server-side byte check (UTF-8), authoritative — frontend check is not trusted.
  const byteLength = Buffer.byteLength(content, 'utf8');
  if (byteLength > MAX_BODY_BYTES) {
    return sendJson(res, 413, { error: 'Paste is too large. Limit is 5 MB.' });
  }

  const now = new Date();
  const paste = {
    id: newPasteId(),
    content, // stored as-is: no formatting, no trimming, no mutation
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
  };

  try {
    await storage.putPaste(paste);
  } catch (e) {
    const status = e.statusCode || 500;
    const message =
      e.code === 'STORAGE_NOT_CONFIGURED' || status === 503
        ? e.message
        : 'Paste could not be created. Please try again.';
    return sendJson(res, status, { error: message });
  }

  return sendJson(res, 201, {
    id: paste.id,
    url: `/p/${paste.id}`,
    rawUrl: `/raw/${paste.id}`,
    expiresAt: paste.expiresAt,
  });
};

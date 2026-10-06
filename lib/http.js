// Small HTTP helpers shared by all API handlers.
'use strict';

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MiB (spec)

const BASE_SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
};

function sendJson(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    ...BASE_SECURITY_HEADERS,
    ...extraHeaders,
  });
  res.end(body);
}

function sendHtml(res, status, html, extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy':
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    ...BASE_SECURITY_HEADERS,
    ...extraHeaders,
  });
  res.end(html);
}

/**
 * Read the request body as a Buffer with a hard byte cap.
 * Rejects as soon as the stream exceeds maxBytes (no buffering of huge bodies).
 */
function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Strict paste id validation: URL-safe alphabet only, sensible length.
function isValidPasteId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(id);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  MAX_BODY_BYTES,
  sendJson,
  sendHtml,
  readBody,
  clientIp,
  isValidPasteId,
  escapeHtml,
  BASE_SECURITY_HEADERS,
};

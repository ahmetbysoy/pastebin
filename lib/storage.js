// Shared storage layer for Vercel Blob.
// CJS so the same module works in Vercel Node functions and the local dev server.
'use strict';

let blobSdk = null;
function sdk() {
  if (!blobSdk) blobSdk = require('@vercel/blob');
  return blobSdk;
}

const PASTE_PREFIX = 'pastes/';

/**
 * Resolve the Blob read/write token from the environment.
 * Accepts BLOB_READ_WRITE_TOKEN or any *_READ_WRITE_TOKEN (Vercel sometimes
 * creates prefixed variables like MYSTORE_READ_WRITE_TOKEN when connecting a store).
 */
function resolveToken() {
  const direct = process.env.BLOB_READ_WRITE_TOKEN;
  if (direct && direct.trim()) {
    return { token: direct.trim(), envName: 'BLOB_READ_WRITE_TOKEN' };
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith('_READ_WRITE_TOKEN') && value && value.trim()) {
      return { token: value.trim(), envName: key };
    }
  }
  return null;
}

function looksLikeBlobToken(token) {
  return typeof token === 'string' && token.startsWith('vercel_blob_rw_');
}

// ---------------------------------------------------------------------------
// In-memory fallback. ONLY used when LOCAL_STORAGE_FALLBACK=1 (local dev
// server). Never enabled on Vercel.
// ---------------------------------------------------------------------------
const memory = new Map();

function memoryPut(key, body, options = {}) {
  memory.set(key, {
    body: String(body),
    metadata: options.metadata || {},
    uploadedAt: new Date().toISOString(),
  });
  return { url: `mem://local/${key}`, pathname: key, storageToken: '' };
}

async function memoryGet(key) {
  const entry = memory.get(key);
  if (!entry) {
    const err = new Error('Blob not found');
    err.name = 'BlobNotFoundError';
    throw err;
  }
  return { text: async () => entry.body, metadata: entry.metadata };
}

function memoryList(prefix) {
  const blobs = [];
  for (const [key, entry] of memory.entries()) {
    if (key.startsWith(prefix)) {
      blobs.push({ pathname: key, url: `mem://local/${key}`, metadata: entry.metadata });
    }
  }
  return { blobs, cursor: undefined, hasMore: false };
}

function memoryDel(key) {
  memory.delete(key);
}

function localFallbackEnabled() {
  return process.env.LOCAL_STORAGE_FALLBACK === '1';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns { mode } where mode is 'vercel-blob', 'local-memory',
 * or throws a friendly, leak-free error when storage is not configured.
 */
function ensureStorage() {
  const resolved = resolveToken();
  if (resolved) return { mode: 'vercel-blob', ...resolved };
  if (localFallbackEnabled()) return { mode: 'local-memory' };

  const err = new Error(
    'Storage is not configured: no Blob token found. ' +
      'Connect a Vercel Blob store to this project (or set BLOB_READ_WRITE_TOKEN) and redeploy.'
  );
  err.statusCode = 503;
  err.code = 'STORAGE_NOT_CONFIGURED';
  throw err;
}

function hintForBadToken(token, envName, originalError) {
  if (token && !looksLikeBlobToken(token)) {
    let hint =
      `The token in ${envName} does not look like a Vercel Blob token ` +
      '(expected prefix "vercel_blob_rw_"). ';
    if (token.startsWith('vcp_')) {
      hint +=
        'A "vcp_" token is a Vercel account/API access token and cannot be used with Blob storage. ' +
        'Copy the token from Dashboard -> Storage -> your store -> Connect Store.';
    } else {
      hint += 'Copy the token from Dashboard -> Storage -> your store -> Connect Store.';
    }
    return new Error(hint + (originalError ? ` (upstream: ${originalError.name})` : ''));
  }
  return null;
}

async function putPaste(paste) {
  const storage = ensureStorage();
  const key = `${PASTE_PREFIX}${paste.id}.json`;
  const body = JSON.stringify(paste);

  if (storage.mode === 'local-memory') {
    memoryPut(key, body, { metadata: { expiresAt: paste.expiresAt } });
    return { key, local: true };
  }

  try {
    const blob = await sdk().put(key, body, {
      access: 'public',
      contentType: 'application/json',
      metadata: { expiresAt: paste.expiresAt },
    });
    return { key, url: blob.url, local: false };
  } catch (e) {
    throw hintForBadToken(storage.token, storage.envName, e) || e;
  }
}

async function getPaste(id) {
  const storage = ensureStorage();
  const key = `${PASTE_PREFIX}${id}.json`;

  if (storage.mode === 'local-memory') {
    try {
      const res = await memoryGet(key);
      return JSON.parse(await res.text());
    } catch (e) {
      if (e.name === 'BlobNotFoundError') return null;
      throw e;
    }
  }

  try {
    // Try by pathname via list (token-scoped, avoids guessing public URLs).
    const listed = await sdk().list({ prefix: key, limit: 1 });
    const match = listed.blobs.find((b) => b.pathname === key);
    if (!match) return null;
    const res = await sdk().get(match.url);
    return JSON.parse(await res.text());
  } catch (e) {
    const hint = hintForBadToken(storage.token, storage.envName, e);
    if (hint) throw hint;
    if (e && (e.name === 'BlobNotFoundError' || e.statusCode === 404)) return null;
    throw e;
  }
}

async function listPasteKeys() {
  const storage = ensureStorage();
  if (storage.mode === 'local-memory') return memoryList(PASTE_PREFIX).blobs;

  const out = [];
  let cursor;
  do {
    const page = await sdk().list({ prefix: PASTE_PREFIX, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.cursor;
    if (!page.hasMore) break;
  } while (cursor);
  return out;
}

async function deletePasteKeys(keys) {
  const storage = ensureStorage();
  if (storage.mode === 'local-memory') {
    keys.forEach((k) => memoryDel(k));
    return;
  }
  if (!keys.length) return;
  await sdk().del(keys);
}

module.exports = {
  ensureStorage,
  putPaste,
  getPaste,
  listPasteKeys,
  deletePasteKeys,
  resolveToken,
  looksLikeBlobToken,
  localFallbackEnabled,
};

// GET /api/health — health check
'use strict';

const { sendJson } = require('../lib/http');
const storage = require('../lib/storage');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

  let storageStatus = 'ok';
  try {
    const s = storage.ensureStorage();
    storageStatus = s.mode === 'local-memory' ? 'ok (local development mode)' : 'ok';
  } catch {
    storageStatus = 'unconfigured';
  }

  return sendJson(res, storageStatus === 'unconfigured' ? 503 : 200, {
    status: storageStatus === 'unconfigured' ? 'degraded' : 'ok',
    storage: storageStatus,
  });
};

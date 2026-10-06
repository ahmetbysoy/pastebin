// Vercel Blob token health-check: put -> list -> get -> delete
// Usage:
//   1) put your token in .env.local  (BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...)
//   2) npm run test:blob
import { put, list, get, del } from '@vercel/blob';
import { readFileSync, existsSync } from 'node:fs';

// Tiny .env.local loader
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('FAIL: BLOB_READ_WRITE_TOKEN is not set. Put it in .env.local first.');
  process.exit(1);
}
console.log('Token loaded (masked):', token.slice(0, 10) + '...' + token.slice(-4));

if (!token.startsWith('vercel_blob_rw_')) {
  console.error('\nWARNING: this does NOT look like a Vercel Blob token.');
  if (token.startsWith('vcp_')) {
    console.error(
      'It is a Vercel ACCOUNT access token (vcp_...). Blob needs the token from\n' +
        'Dashboard -> Storage -> your store -> Connect Store, which starts with "vercel_blob_rw_".'
    );
  }
  console.error('Continuing the test anyway so you can see the real error...\n');
}

const key = `healthcheck/test-${Date.now()}.txt`;
try {
  const blob = await put(key, 'healthcheck ' + new Date().toISOString(), { access: 'public' });
  console.log('PUT   OK:', blob.url);

  const listed = await list({ prefix: 'healthcheck/' });
  console.log('LIST  OK, blobs under healthcheck/:', listed.blobs.length);

  const fetched = await get(blob.url);
  const text = await fetched.text();
  console.log('GET   OK, content length:', text.length);

  await del(blob.url);
  console.log('DEL   OK');
  console.log('\nRESULT: Token WORKS. put/list/get/delete all succeeded.');
} catch (e) {
  console.error('\nRESULT: BLOB TEST FAILED');
  console.error('Error:', e.message);
  if (/No token found/i.test(e.message)) {
    console.error('\n-> The env variable is not reaching the process.');
  } else if (/unauthorized|forbidden|401|403/i.test(e.message)) {
    console.error('\n-> Token was rejected. It is likely the wrong kind of token or from another store/account.');
  }
  process.exit(1);
}

// Tiny static server for docs/ (local preview only).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const port = Number(process.env.PORT || 3000);

http.createServer(async (req, res) => {
  const file = new URL(req.url, 'http://x').pathname === '/' ? 'index.html' : new URL(req.url, 'http://x').pathname.slice(1);
  try {
    const data = await readFile(path.join(root, path.normalize(file).replace(/^(\.\.[/\\])+/, '')));
    res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`docs preview on http://0.0.0.0:${port}`));

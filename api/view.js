// GET /api/view?id=:id  (also routed as /p/:id) — safe paste viewer page.
// The page renders user content via textContent only (never innerHTML),
// and is served with a strict CSP.
'use strict';

const { sendHtml, sendJson, isValidPasteId, escapeHtml } = require('../lib/http');

const PAGE = (safeId) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paste ${safeId}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
         background: #0b0e14; color: #d7dde6; min-height: 100vh; display: flex; flex-direction: column; }
  header { padding: 14px 16px; border-bottom: 1px solid #1e2530; display: flex;
           justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  header .id { color: #7aa2f7; font-weight: 600; }
  header .meta { color: #6b7686; font-size: 12px; }
  main { flex: 1; padding: 16px; overflow: auto; }
  pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 14px; line-height: 1.55; }
  .notice { color: #e0af68; padding: 24px; text-align: center; }
  .toolbar { display: flex; gap: 8px; }
  a.btn, button.btn { font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 6px;
    border: 1px solid #2b3546; background: #151b26; color: #d7dde6; text-decoration: none; cursor: pointer; }
  a.btn:hover, button.btn:hover { background: #1c2534; }
</style>
</head>
<body>
<header>
  <div><span class="id">#${safeId}</span> <span class="meta" id="meta"></span></div>
  <div class="toolbar">
    <a class="btn" id="raw-link" href="/raw/${safeId}">Raw</a>
    <button class="btn" id="copy-btn" type="button">Copy content</button>
  </div>
</header>
<main>
  <div class="notice" id="notice" hidden>Loading…</div>
  <pre id="content"></pre>
</main>
<script>
(async function () {
  var notice = document.getElementById('notice');
  var content = document.getElementById('content');
  var meta = document.getElementById('meta');
  try {
    var r = await fetch('/api/paste/${safeId}', { headers: { accept: 'application/json' } });
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      notice.textContent = (data && data.error) || 'Paste not found or expired.';
      notice.hidden = false;
      return;
    }
    // Safe rendering: textContent only, user content is never parsed as HTML.
    content.textContent = data.content;
    var expires = new Date(data.expiresAt);
    if (!isNaN(expires.getTime())) {
      var hours = Math.max(0, Math.round((expires.getTime() - Date.now()) / 3600000 * 10) / 10);
      meta.textContent = 'expires in ~' + hours + 'h';
    }
    document.getElementById('copy-btn').addEventListener('click', function () {
      var text = data.content;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        ta.remove(); ok();
      }
      function ok() {
        var b = document.getElementById('copy-btn');
        b.textContent = 'Copied!'; setTimeout(function () { b.textContent = 'Copy content'; }, 1500);
      }
    });
  } catch (e) {
    notice.textContent = 'Paste could not be loaded. Please try again.';
    notice.hidden = false;
  }
})();
</script>
</body>
</html>`;

module.exports = async function handler(req, res) {
  const id = (req.query && req.query.id) || '';
  if (!isValidPasteId(id)) {
    return sendJson(res, 404, { error: 'Paste not found.' });
  }
  // id passed validation against a strict charset -> safe to embed.
  return sendHtml(res, 200, PAGE(escapeHtml(id)));
};

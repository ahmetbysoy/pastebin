// Minimal Paste configuration.
// The token is intentionally public: it is a fine-grained GitHub PAT scoped to
// THIS repository only, with Contents read/write permission and nothing else.
// Rotate it periodically (fine-grained PATs expire after at most 1 year).
window.PASTE_CONFIG = {
  owner: 'ahmetbysoy',
  repo: 'pastebin',
  branch: 'pastes', // orphan branch used as storage
  token: '', // paste the fine-grained PAT here (or use the token field in the UI)
};

// Minimal Paste configuration.
// The token is intentionally public: it is a fine-grained GitHub PAT scoped to
// THIS repository only, with Contents read/write permission and nothing else.
// Rotate it periodically (fine-grained PATs expire after at most 1 year).
window.PASTE_CONFIG = {
  owner: 'ahmetbysoy',
  repo: 'pastebin',
  branch: 'pastes', // orphan branch used as storage
  // Fine-grained PAT, scoped to this repo only (Contents: read/write).
  // Test token — expires in 1 day; rotate afterwards.
  token: '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',
};

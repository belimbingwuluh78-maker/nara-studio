# Contributing

The current target is Windows with Node.js 22+ and Chrome/Edge. Run `npm ci` and `npm start` to launch the studio.

1. Create a branch for a focused change.
2. Describe the problem and resulting behavior.
3. Run `npm run check` and `npm test`. Check desktop and narrow-screen layouts for UI changes.
4. Add meaningful tests for changes to parsing, validation, or connection lifecycle handling. Automated tests must not require paid services or real user accounts.
5. Open a pull request with verification results and remaining limitations.

Do not commit environment files, API/stream keys, real OAuth JSON, cookies, private avatar/audio assets, node_modules, model caches, or Python environments. Do not report a waiting or failed connection as successfully connected.

TikTok reader changes should include fixture tests and, where available, an authorized LIVE test. Users complete login and CAPTCHA themselves; do not add bypasses or collect passwords/cookies.

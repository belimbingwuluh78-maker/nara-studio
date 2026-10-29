# Third-party notices

Original Nara Studio source retains its MIT license (LICENSE). Dependencies retain their own licenses.

## Playwright Core 1.56.1

- Package: playwright-core (Apache-2.0)
- Source: https://github.com/microsoft/playwright
- License and notices copied without modification into licenses/.
- Used to launch a separate installed Edge/Chrome browser for TikTok chat reading. Browser binaries are not included.

The former tiktok-live-connector dependency and Euler Stream integration have been removed. No signing service is used by the new reader.

jsdom is a development-only dependency used by DOM fixture tests. Express, ws, ffmpeg-static/FFmpeg, OmniVoice and model components retain their own notices. Source archives exclude node_modules, browser profiles, model weights, personal data and binary runtimes.

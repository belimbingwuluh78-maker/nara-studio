# Nara Studio user guide

Nara Studio is an experimental local livestream studio for gameplay, AI avatars, and viewer interaction. The original application is MIT licensed; dependencies and models have their own licenses. No OBS installation is required.

## Install and start

Use Windows, Node.js 22 or newer, and Chrome or Microsoft Edge. From the project folder:

```powershell
npm ci
npm start
```

Alternatively, double-click `start-studio.cmd`. Open **http://localhost:3210** and leave the server terminal running. Use one studio tab to control a broadcast.

The first installation downloads dependencies and FFmpeg. If npm blocks the FFmpeg install script, follow its instructions to allow the package script, or run `npm rebuild ffmpeg-static`. Localhost still uses local executable processes, including Node.js, FFmpeg, and the speech engine. This is not a standalone offline executable.

## Try the studio without platform accounts

1. Click **Test avatar voice** to hear the local Windows voice and see audio-driven mouth movement.
2. Select **Gameplay**, **Just chatting**, or **Be right back**.
3. Click **Select** beside **Game / screen**. Choose a window or screen and enable audio sharing when available. Check the source label to see whether audio was captured.
4. Enable your webcam or microphone if needed. Use headphones to avoid feedback.
5. Enter a test comment in **Viewer comments**. It is labeled **SIMULATION** and is not posted to a platform. An AI API key is required for AI-generated replies.
6. Click **Record locally** to save the composition as WebM. Recordings stop and download automatically after five minutes to limit RAM use.

## Configure the AI co-host

Open **Settings**. Select DeepSeek, Kimi/Moonshot, or OpenAI, enter an API key from that provider, and choose a model your account can access. A ChatGPT or other consumer chat subscription does not automatically provide API access or API credits.

The default persona asks Nara to answer in English, use no more than three sentences, and avoid inventing game events. Edit **Persona / show context** for your own host identity, language, and show material. The AI cannot see the game screen.

Enable **Auto-reply** after chat and voice are ready. Replies are spoken by the avatar and mixed into recordings and the outgoing broadcast; they are not posted as text to platform chats. You can also click **Reply with AI** on an individual comment.

The queue holds at most ten comments. The default cooldown is 15 seconds after a reply finishes, with a limit of 50 replies per studio tab session. These limits are not provider spending limits. **Pause AI** cancels the active request, stops speech, and clears the queue. Historical comments are not automatically answered. There is no fabricated reply fallback when an API fails.

AI keys, account access tokens, and stream keys stay in server memory and are lost when the server stops. Switching AI providers clears the active API key. Voice settings and imported Google client configuration are stored locally as described below.

## Choose an avatar

Open **Avatar & voice**. Changes appear immediately in the same canvas used for recording and streaming.

- Use the built-in Nara avatar, or select **My PNG avatar** and upload an idle image with the mouth closed.
- Add a talking image with the mouth open to switch frames with AI audio amplitude.
- Add an optional blink image with the eyes closed. Use matching dimensions and character positions for all images.
- PNG files may be up to 5 MB each and 4096 × 4096 pixels. Transparency is preserved.
- Adjust size, horizontal/vertical position, breathing or sway, and automatic blinking.

A PNG uses frame switching and simple transforms; it does not acquire a full body rig. Live2D, VRM, face tracking, and model-generated expressions are not implemented.

Images stay in the studio browser's IndexedDB, with placement settings in localStorage. They are not uploaded to the AI provider. Clearing browser site data removes saved avatars.

## Choose a voice

Windows speech is available without an AI model download and prefers an installed English voice, falling back to the system default if none is available. The voice test uses an English greeting.

OmniVoice supports a separate output language setting: English by default, with Indonesian, Japanese, and Chinese available in the interface. Existing saved voice preferences are preserved. To match another language, change both the AI persona and the OmniVoice language.

### Install OmniVoice

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run `setup-omnivoice.ps1` from PowerShell in the project folder. The script creates an isolated Python 3.11 environment in `.venv` and installs PyTorch 2.8/CUDA 12.8 and OmniVoice 0.2.1. The system Python installation is not changed. For laptops without an NVIDIA GPU, run `.\setup-omnivoice.ps1 -Device cpu` to install the CPU version instead.

Downloads require several GB. The `k2-fsa/OmniVoice` model is downloaded on first load to `.runtime/models`.

1. Select **OmniVoice · local AI** in **Avatar & voice**.
2. Select CPU or NVIDIA GPU. CPU leaves more GPU memory for games but may take longer to generate speech. GPU mode requires sufficient VRAM alongside your game.
3. Select **Design a voice**, **Use my voice reference**, or **Automatic voice**. Automatic mode does not guarantee the same voice identity for every reply.
4. For voice design, use English descriptions such as `female, young adult` or `male, low pitch`. Select the output language separately; quality varies by language.
5. For a reference voice, upload your own or an authorized WAV/MP3 recording and enter its exact transcript. The reference must be 1–30 seconds long and at most 12 MB. Audio is converted locally to mono 24 kHz WAV; only the first 30 seconds are retained. The transcript avoids loading an additional transcription model.
6. Click **Save voice**, **Load OmniVoice**, then **Test voice**. First load requires internet. Generation runs locally after the required model files are cached.
7. Click **Unload model** to stop the worker and release its memory. Pausing AI during generation also stops the worker; the next request reloads the model.

The Python worker communicates over standard input/output without opening another network port. WAV audio enters the Web Audio mixer, lip sync, recordings, and encoder. OmniVoice failures do not silently switch to Windows speech.

Settings are stored in `data/voice.json`, and the reference recording in `data/voice-reference.wav`. These files and model caches are excluded from source packages. Delete a reference recording when you no longer need it.

OmniVoice is a third-party project; see [its repository](https://github.com/k2-fsa/OmniVoice) for its license and component requirements.

## Connect YouTube

### One-time Google setup

This alpha requires your own Google Cloud project. **Google setup** provides the same steps inside the studio:

1. Create/select a Google Cloud project and enable **YouTube Data API v3**.
2. Configure Google Auth Platform branding and consent. For personal testing, choose **External**, leave the app in **Testing**, and add the Google account that owns your channel under **Audience → Test users**.
3. Create a **Web application** client and register `http://localhost:3210/oauth/callback` as an **Authorized redirect URI**. If you change the studio port, use the exact URI shown in the studio.
4. Download the client JSON. Click **Google setup**, select the file, then **Import & enable sign-in**. The studio validates it and saves it in `data/google-client.json`; no restart is needed. Developers may instead set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` and restart; environment configuration takes priority.
5. Click **Sign in with Google**. Choose your account and allow YouTube access in your default Windows browser. If it does not open, use **Copy sign-in link** and paste it into Chrome or Edge. The callback validates your channel before the studio shows a connection.

Google sign-in uses OAuth behind the scenes. Never enter a Google password into Nara Studio. Do not bundle the Google client secret or `data/` folder in a public repository or source ZIP. Account tokens remain in memory; sign in again after stopping the server.

For broader distribution, authentication architecture and any Google publication/verification requirements still need to be addressed. Do not distribute a shared web-client secret with the app.

### Select and start a broadcast

1. Create an encoder broadcast in YouTube Studio; use Private or Unlisted for testing.
2. Click **Select broadcast** in Nara. The list shows privacy and lifecycle status.
3. Click **Connect chat**, prepare your capture and audio, then click **Send to YouTube**. If auto-start is enabled on YouTube, sending media may immediately start the broadcast.
4. If auto-start is disabled, wait until YouTube receives the stream, then click **Go live**. With a monitor stream enabled, the first click may start testing; follow the status message and click again when ready.
5. **Stop encoder** stops media transmission. **End live** ends the selected YouTube broadcast and cannot resume that same broadcast afterward.

Manual RTMP/RTMPS and stream-key input are also available. A stream key alone does not grant chat access. Chat uses YouTube API pagination, deduplication, and the polling interval returned by YouTube. Reconnect manually after a quota or connection failure. Long-duration polling has not been optimized with streamList.

## Stream to TikTok, Twitch, Facebook Live, Kick, or another platform

Select a **Streaming platform**, then click **Set stream key**. Each option provides instructions and a dashboard link.

| Platform | Configuration |
| --- | --- |
| TikTok | Copy the server URL and stream key provided to your account. Manage the LIVE session on TikTok. |
| Twitch | The default server is `rtmp://live.twitch.tv/app`; you can choose another ingest server. Copy your stream key from the Creator Dashboard and set the title/category there. |
| Facebook Live | Copy the session server URL and stream key from Live Producer. Check the preview and manage LIVE on Facebook. |
| Kick | Copy Stream URL and Key from the Creator Dashboard's Channel settings. Set the title/category on Kick. |
| Other / Custom RTMP/RTMPS | Enter the URL and key from a compatible provider. SRT and WHIP are not supported. |

Paste the complete stream key, including `?` and `&` parameters when supplied. **Save connection** only stores the destination; it does not send media. Prepare the preview, click **Send to [platform]**, and confirm when ready. Sending media may immediately make the broadcast public. Check its actual status on the platform.

The composition is 1280 × 720 landscape. One destination is supported at a time. Google sign-in is not needed for these manual destinations. Platform eligibility and access to a stream key must already be available on your account; Nara does not grant them.

Switching platforms clears the previous destination/key, disconnects chat, and clears the selected broadcast. Destination changes are rejected while the encoder runs. **Stop encoder** stops media, but check and end the LIVE session on the platform if needed.

## Twitch and TikTok chat → spoken avatar replies

1. Choose the platform, then click **Connect chat** or **03 · Connect with viewers**.
2. Enter a username only. Twitch reads public chat without account sign-in. TikTok opens a separate installed Microsoft Edge window, with Google Chrome as a fallback, at that account's LIVE page.
3. Leave the reader window open. Complete any sign-in or CAPTCHA yourself in TikTok. Nara does not fill passwords, extract cookies, bypass verification, or use Euler Stream. No chat API key is required.
4. **Check browser** means the reader is waiting for recognizable comments, the expected page, or sign-in/verification. **Reading chat** is shown only after a recognizable username/comment pair is found on the correct LIVE page.
5. Configure an AI key in **Settings**, select a voice in **Avatar & voice**, and enable **Auto-reply**. New comments can produce spoken replies and avatar movement. They are included in the broadcast when the encoder is active; no text replies are sent to Twitch or TikTok.
6. **Cancel connection** or **Disconnect chat** closes the studio-owned reader and clears the AI queue. Personal browser windows are not closed. Closing the reader, changing platforms, or stopping the server also cleans up the connection.

The last channel username is saved in the studio browser. TikTok uses a separate temporary session; its sign-in is not saved for later runs. Its page audio is muted to avoid capture feedback. The extra browser still uses CPU/RAM and may play video.

**TikTok support is unofficial and experimental.** Only recognizable comments rendered on the page can be read. Initial historical messages are ignored and repeated renders are deduplicated. Fast chats, missing rendered comments, layout changes, and verification can cause missed messages. Username-only access is not guaranteed. A waiting status does not prove the account is LIVE.

The reader recognizes both English and Indonesian TikTok status pages. These external-page matching rules are independent of the English studio interface. DOM selectors may need updating when TikTok changes.

Facebook Live, Kick, and Custom RTMP do not have chat connectors. Use simulated comments to try the AI on those platforms.

## Current limits and verification

- Browser capture requires permission and is not native game hooking. System audio depends on the browser, capture source, and Windows.
- Keep the studio open. Background/minimized tabs may throttle rendering.
- Media is encoded as WebM by the browser and transcoded by FFmpeg to H.264/AAC. This adds load; Nara is not proven lighter than OBS. GPU encoders are optional and hardware dependent; CPU is the default.
- There is no microphone speech-to-text conversation, turn detection, or game-screen analysis.
- Automatic encoder reconnect, crash recovery, and two-hour live stability are not verified.
- AI APIs and platform connections need internet. Open-source application licensing does not include cloud services or API credits.

Run the local checks with:

```powershell
npm run check
npm test
```

The automated suite covers ingest validation, chat parsing/deduplication/lifecycle, browser reader fixtures, local API protections, mocked Google OAuth, Windows WAV speech, and real FFmpeg conversion. GitHub Actions runs these checks on Windows. These checks do not establish a real TikTok LIVE or authenticate a real Google account.

Prior manual checks covered studio layouts, browser launch/close, PNG persistence, local recording, and OmniVoice generation on the development Windows laptop. OmniVoice generated Indonesian WAV audio in those earlier checks; that is not an English voice quality benchmark. Voice cloning with a user's recording, real Google sign-in, public broadcasts to external services, and the complete real-viewer → paid AI → speech → public-stream flow still require account-based verification. Resource use alongside games has not been benchmarked.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Google `redirect_uri_mismatch` | Match the exact redirect URI shown in Google setup. |
| Google `access_denied` | Confirm consent and add your account as a test user while the app is in Testing. |
| Google API disabled | Enable YouTube Data API v3 in the same Cloud project. |
| TikTok remains at Check browser | Check the correct LIVE page, visible comments, and any sign-in/CAPTCHA prompt. |
| OmniVoice cannot load | Run its setup script, check free memory, or switch to CPU. |
| Windows voice is unavailable | Check installed Windows speech voices or configure OmniVoice. |
| Encoder stops | Check the server URL, complete stream key, network, and selected encoder; try CPU. |

## Data and licensing

Keep `.env`, `data/`, recordings, voice references, browser profiles, `.venv`, `.runtime`, and `node_modules` out of source archives and Git commits. Bind the server to localhost; do not expose it directly to the internet.

See [README](../README.md), [security policy](../SECURITY.md), and [third-party notices](../THIRD-PARTY-NOTICES.md). Original code is MIT licensed. FFmpeg binaries, dependencies, and models retain their own licenses.

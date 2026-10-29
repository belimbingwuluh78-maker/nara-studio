# Working with the GitHub repository

The public source repository is [belimbingwuluh78-maker/nara-studio](https://github.com/belimbingwuluh78-maker/nara-studio).

## Get the source

```powershell
git clone https://github.com/belimbingwuluh78-maker/nara-studio.git
cd nara-studio
npm ci
npm start
```

See [README.md](README.md) for requirements, setup, features, and current limitations.

## Publish updates

Work in a clone of the repository. Review changes before committing:

```powershell
git status --short
git diff
npm run check
npm test
git add <reviewed-files>
git commit -m "Describe the change in English"
git push origin main
```

Use GitHub sign-in or Git Credential Manager when prompted. Do not place access tokens in commands or source files. Contributors should use a branch and pull request as described in [CONTRIBUTING.md](CONTRIBUTING.md).

Keep credentials, stream keys, recordings, voice references, model weights, and generated folders out of commits. The repository includes `.gitignore` rules and an empty `.env.example` for configuration guidance.

Open the **Actions** tab to check the Windows workflow after pushing a change.

GitHub hosts the source code. This application cannot run on GitHub Pages: it requires a local Node.js server, FFmpeg, and optional local browser/model processes.

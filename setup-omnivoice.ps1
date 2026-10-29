$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:UV_CACHE_DIR = Join-Path $PSScriptRoot '.runtime\uv-cache'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $PSScriptRoot '.runtime\python'
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { throw 'Install uv from https://docs.astral.sh/uv/getting-started/installation/ then rerun this script.' }
uv venv --python 3.11 --allow-existing .venv
if ($LASTEXITCODE) { throw 'Python environment setup failed.' }
uv pip install --python .venv/Scripts/python.exe torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cu128
if ($LASTEXITCODE) { throw 'PyTorch installation failed.' }
uv pip install --python .venv/Scripts/python.exe -r requirements-omnivoice.txt
if ($LASTEXITCODE) { throw 'OmniVoice installation failed.' }
Write-Host 'OmniVoice installed. Open Avatar & voice in the studio and click Load OmniVoice.'

"""Isolated local OmniVoice worker. JSON lines over stdio; no network listener."""
import base64
import contextlib
import io
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.environ.setdefault('HF_HOME', str(ROOT / '.runtime' / 'models'))
os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY', '1')
os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')
sys.stdout.reconfigure(encoding='utf-8')
sys.stdin.reconfigure(encoding='utf-8')
model = None
device = None

def emit(data):
    sys.__stdout__.write('@@NARA@@' + json.dumps(data, ensure_ascii=True) + '\n')
    sys.__stdout__.flush()

def load(target):
    global model, device
    if model is not None and device == target:
        return
    emit({'type': 'phase', 'message': 'Loading the OmniVoice model; the first download may take several minutes.'})
    import torch
    from omnivoice import OmniVoice
    torch.set_num_threads(min(6, os.cpu_count() or 4))
    if target == 'cuda' and not torch.cuda.is_available():
        raise ValueError('A CUDA GPU is unavailable. Select CPU.')
    if model is not None:
        del model
        model = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    model = OmniVoice.from_pretrained(
        os.environ.get('OMNIVOICE_MODEL', 'k2-fsa/OmniVoice'),
        device_map='cuda:0' if target == 'cuda' else 'cpu',
        dtype=torch.float16 if target == 'cuda' else torch.float32,
        attn_implementation='sdpa',
    )
    model.eval()
    device = target
    emit({'type': 'phase', 'message': 'OmniVoice ready on ' + target.upper()})

emit({'type': 'ready'})
for line in sys.stdin:
    request = {}
    try:
        request = json.loads(line)
        with contextlib.redirect_stdout(sys.stderr):
            load(request.get('device', 'cpu'))
            if request.get('action') == 'load':
                audio = None
            else:
                import soundfile as sf
                kwargs = dict(text=request['text'][:1200], language=request.get('language', 'en'),
                              speed=float(request.get('speed', 1)), num_step=int(request.get('steps', 16)))
                if request.get('mode') == 'clone':
                    # Only a fixed, server-owned reference file may be read.
                    ref = Path(os.environ.get('STUDIO_DATA_DIR', str(ROOT / 'data'))) / 'voice-reference.wav'
                    if not ref.exists() or not request.get('refText', '').strip():
                        raise ValueError('Upload a voice reference and enter its transcript.')
                    samples, rate = sf.read(ref, dtype='float32')
                    if samples.ndim > 1:
                        samples = samples.mean(axis=1)
                    if not 1 <= len(samples) / rate <= 30.1:
                        raise ValueError('The voice reference must be 1–30 seconds long.')
                    import torch
                    kwargs.update(ref_audio=(torch.from_numpy(samples).unsqueeze(0), rate), ref_text=request['refText'][:2000])
                elif request.get('mode') == 'design':
                    kwargs['instruct'] = request.get('instruct', 'female, young adult')[:500]
                started = time.monotonic()
                result = model.generate(**kwargs)
                buf = io.BytesIO()
                sf.write(buf, result[0], 24000, format='WAV', subtype='PCM_16')
                audio = base64.b64encode(buf.getvalue()).decode('ascii')
        emit({'type': 'result', 'id': request.get('id'), 'audio': audio, 'device': device,
              'seconds': round(time.monotonic() - started, 2) if audio else 0})
    except Exception as exc:
        message = str(exc)
        if 'out of memory' in message.lower():
            message = 'Not enough VRAM. Unload the model and select CPU, or close other GPU applications.'
        emit({'type': 'error', 'id': request.get('id'), 'error': message[:700]})

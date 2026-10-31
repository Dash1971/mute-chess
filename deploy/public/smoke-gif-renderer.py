#!/usr/bin/env python3
"""Exercise a built native renderer on loopback only; never touches public Lila."""
import io
import json
from pathlib import Path
import subprocess
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

binary = Path(sys.argv[1]).resolve()
port = 26175
origin = f'http://127.0.0.1:{port}'
fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1'
process = subprocess.Popen([str(binary), '--bind', f'127.0.0.1:{port}'], stdout=subprocess.DEVNULL)
try:
    query = urllib.parse.urlencode({'fen': fen, 'theme': 'quiet-signal', 'piece': 'cburnett', 'orientation': 'white'})
    for attempt in range(100):
        if process.poll() is not None:
            raise RuntimeError('Native renderer exited during startup')
        try:
            data = urllib.request.urlopen(origin + '/image.gif?' + query, timeout=2).read()
            break
        except (OSError, TimeoutError):
            time.sleep(.1)
    else:
        raise RuntimeError('Native renderer did not become ready')
    image = Image.open(io.BytesIO(data)).convert('RGB')
    pixels = set(image.getdata())
    assert (199, 207, 186) in pixels and (102, 132, 120) in pixels, 'export must retain both exact moss colors'
    black_query = urllib.parse.urlencode({'fen': fen, 'theme': 'quiet-signal', 'piece': 'cburnett', 'orientation': 'black'})
    black = urllib.request.urlopen(origin + '/image.gif?' + black_query, timeout=10).read()
    assert black != data, 'orientation must affect the rendered image'
    payload = {'theme': 'quiet-signal', 'piece': 'cburnett', 'orientation': 'white', 'delay': 80,
               'frames': [{'fen': fen}, {'fen': '8/4k3/8/8/8/8/8/4K3 w - - 1 2', 'lastMove': 'e8e7'}]}
    request = urllib.request.Request(origin + '/game.gif', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    gif_data = urllib.request.urlopen(request, timeout=10).read()
    gif = Image.open(io.BytesIO(gif_data))
    # Native render.rs adds a final black Twitter workaround frame (kork).
    assert gif.n_frames == len(payload['frames']) + 1, 'native animation must retain both positions and its trailing frame'
    gif.seek(0); first_frame = gif.convert('RGB').tobytes()
    gif.seek(1); second_frame = gif.convert('RGB').tobytes()
    assert first_frame != second_frame, 'the second requested position must be rendered'
    gif.seek(gif.n_frames - 1)
    assert len(set(gif.convert('RGB').getdata())) == 1, 'native trailing workaround frame must be solid'
    if len(sys.argv) > 2:
        evidence = Path(sys.argv[2]); evidence.mkdir(parents=True, exist_ok=True)
        (evidence / 'position.gif').write_bytes(data)
        image.save(evidence / 'position.png')
        (evidence / 'flipped-position.gif').write_bytes(black)
        (evidence / 'animation.gif').write_bytes(gif_data)
        status = Path(f'/proc/{process.pid}/status')
        (evidence / 'runtime.json').write_text(json.dumps({'nativeMossColors': ['#c7cfba', '#668478'], 'frames': gif.n_frames, 'logicalFrames': len(payload['frames']), 'memory': [line for line in status.read_text().splitlines() if line.startswith(('VmRSS:', 'VmHWM:'))]}, indent=2)+'\n')
    print('Native renderer image, exact moss colors, orientation and two-frame GIF passed')
finally:
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()

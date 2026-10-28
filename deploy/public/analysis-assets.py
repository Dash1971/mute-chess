#!/usr/bin/env python3
"""Verify generated browser analysis matches the main source and download pins."""
from pathlib import Path
import hashlib,json,sys

def verify(source, built):
    source,built=Path(source),Path(built)
    expected={str(p.relative_to(source)):hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()}
    config=json.loads((source/'config.json').read_text())
    for model in config['models'].values():expected['models/'+model['id']+'.onnx']=model['sha256']
    expected['ort-wasm-simd-threaded.wasm']=config['runtime']['assets']['wasm']['sha256']
    actual={str(p.relative_to(built)) for p in built.rglob('*') if p.is_file()}
    if actual!=set(expected):raise ValueError('Analysis build has missing or extra assets: '+str(actual^set(expected)))
    for relative,digest in expected.items():
        with (built/relative).open('rb') as file:
            if hashlib.file_digest(file,'sha256').hexdigest()!=digest:raise ValueError('Analysis asset differs from main/pin: '+relative)
    return expected

if __name__=='__main__':
    print(json.dumps(verify(*sys.argv[1:]),sort_keys=True))

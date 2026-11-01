#!/usr/bin/env python3
"""Prepare same-origin, pinned browser analysis assets; weights never enter Git."""
from pathlib import Path
import hashlib,json,shutil,sys,urllib.request
source=Path(__file__).resolve().parents[2]/'analysis/browser'
dest=Path(sys.argv[1]).resolve()/'public/nosweat/analysis'
shutil.copytree(source,dest,dirs_exist_ok=True)
config=json.loads((source/'config.json').read_text())
for asset,relative in [(m,'models/'+m['id']+'.onnx') for m in config['models'].values()] + [(a,Path(a['url']).name) for a in config['runtime']['assets'].values()]:
    output=dest/relative
    def matches(path):
        return path.exists() and path.stat().st_size==asset['bytes'] and hashlib.file_digest(path.open('rb'),'sha256').hexdigest()==asset['sha256']
    if matches(output):continue
    output.parent.mkdir(parents=True,exist_ok=True)
    # Reuse the already-verified live-model download without modifying it.
    existing=Path('/srv/club-maia/models/maia3-79m.onnx')
    if relative=='models/79m.onnx' and matches(existing):shutil.copy(existing,output)
    else:
        temporary=output.with_suffix('.download')
        with urllib.request.urlopen(asset['sourceUrl'],timeout=60) as response,temporary.open('wb') as file:shutil.copyfileobj(response,file)
        if not matches(temporary):
            temporary.unlink(missing_ok=True)
            raise SystemExit('Invalid pinned asset: '+relative)
        temporary.replace(output)
    print(relative+' verified')

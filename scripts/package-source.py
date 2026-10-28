"""Make the matching source archive; omit credentials, models and build caches."""
import pathlib,tarfile,sys
root=pathlib.Path(__file__).resolve().parents[1]
out=pathlib.Path(sys.argv[1]).resolve()
excluded={'.git','node_modules','.venv','dist','__pycache__','coverage','.scratch'}
def include(info):
    parts=pathlib.PurePosixPath(info.name).parts
    if any(p in excluded for p in parts):return None
    if any((p=='.env' or p.startswith('.env.')) and p!='.env.example' for p in parts):return None
    if info.name.endswith(('.onnx','.pyc','source.tar.gz')):return None
    if info.name in {'public/app.js','public/alpha.js','public/chessground.base.css','public/chessground.brown.css','public/chessground.cburnett.css'}:return None
    return info
with tarfile.open(out,'w:gz') as tar:
    for p in sorted(root.iterdir()):
        if p.resolve()!=out:tar.add(p,arcname=p.name,filter=include)
print(out)

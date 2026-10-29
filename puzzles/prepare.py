#!/usr/bin/env python3
"""Select a bounded, reproducible starter catalog from the official CC0 CSV stream.
Usage: curl -fsSL https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc | python3 prepare.py OUTPUT.csv.gz
A closed input pipe after reaching the limit is expected. Compare the output hash
with catalog.json before importing. The live app never downloads puzzle data.
"""
import csv, gzip, hashlib, io, json, re, sys
from pathlib import Path
out = Path(sys.argv[1])
count = int(sys.argv[2]) if len(sys.argv) > 2 else 50000
rows = []
for row in csv.DictReader(sys.stdin):
    if int(row['Popularity']) < 80 or int(row['NbPlays']) < 100 or int(row['RatingDeviation']) > 100:
        continue
    if not re.fullmatch(r'[A-Za-z0-9]{5}', row['PuzzleId']) or not re.match(r'https://lichess.org/[A-Za-z0-9]{8}(?:/|#|$)', row['GameUrl']):
        raise ValueError('Invalid source identifiers')
    rows.append(row)
    if len(rows) == count:
        break
if len(rows) != count:
    raise ValueError('Incomplete source catalog')
buffer = io.StringIO(newline='')
writer = csv.DictWriter(buffer, fieldnames=list(rows[0]))
writer.writeheader(); writer.writerows(rows)
data = buffer.getvalue().encode()
compressed = io.BytesIO()
with gzip.GzipFile(fileobj=compressed, mode='wb', filename='', mtime=0) as stream:
    stream.write(data)
out.write_bytes(compressed.getvalue())
print(json.dumps({'count':len(rows), 'csvSha256':hashlib.sha256(data).hexdigest(), 'gzipSha256':hashlib.sha256(out.read_bytes()).hexdigest(), 'minimumRating':min(int(r['Rating']) for r in rows), 'maximumRating':max(int(r['Rating']) for r in rows)}, indent=2))

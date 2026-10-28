#!/usr/bin/env python3
"""Generate private service configuration without printing credentials."""
import json
import os
from pathlib import Path
import secrets
import sys

root = Path(sys.argv[1]).resolve()
os.umask(0o077)
path = root / "config/secrets.conf"
values = dict(line.strip().split(" = ", 1) for line in path.read_text().splitlines() if line.strip())
if "nosweat.adapterToken" not in values:
    token = secrets.token_hex(32)
    with path.open("a") as output:
        output.write("\nnosweat.adapterToken = " + json.dumps(token) + "\n")
else:
    token = json.loads(values["nosweat.adapterToken"])
(root / "config/nosweat.conf").write_text('nosweat.enabled = true\nnosweat.adapterUrl = "http://127.0.0.1:19665"\n')
(root / "config/adapter.env").write_text(
    f"ADAPTER_TOKEN={token}\nLILA_ORIGIN=http://127.0.0.1:19663\n"
    f"MAIA_MODEL={root}/data/maia3-79m.onnx\n"
    "MAIA_PYTHON=/opt/club-maia/venv/bin/python\n"
)
for name in ("secrets.conf", "adapter.env", "nosweat.conf"):
    (root / "config" / name).chmod(0o600)
print("Private Nostr/Maia adapter configuration prepared; credentials were not displayed.")

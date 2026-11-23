#!/usr/bin/env bash
set -euo pipefail
# Isolated instance: never changes club-maia.service or its database.
sudo systemd-run --unit=club-maia-test --uid=clubmaia --gid=clubmaia \
  -p WorkingDirectory=/opt/club-maia/app -p Restart=on-failure -p RestartSec=2 \
  -p IPAddressDeny=any -p IPAddressAllow=localhost -p CPUQuota=250% \
  --setenv=PORT=3001 --setenv=ORIGIN=http://127.0.0.1:3001 \
  --setenv=PGHOST=/var/run/postgresql --setenv=PGUSER=clubmaia --setenv=PGDATABASE=clubmaia_test \
  --setenv=MAIA_PYTHON=/opt/club-maia/venv/bin/python \
  --setenv=MAIA_MODEL=/srv/club-maia/models/maia3-79m.onnx \
  /opt/club-maia/node-v24.22.1-linux-x64/bin/node dist/main.js

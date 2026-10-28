#!/usr/bin/env bash
set -euo pipefail
task_root=${1:?Usage: start-adapter.sh /absolute/development/directory}
if systemctl --user is-active --quiet nosweat-lila-adapter; then exit; fi
systemd-run --user --collect --unit nosweat-lila-adapter \
  --property="WorkingDirectory=$task_root/lila-adapter" \
  --property="EnvironmentFile=$task_root/config/adapter.env" \
  --property=NoNewPrivileges=yes --property=MemoryMax=1536M \
  --property=Restart=on-failure --property=RestartSec=5 \
  /opt/club-maia/node-v24.22.1-linux-x64/bin/node --max-old-space-size=256 \
  "$task_root/lila-adapter/server.mjs"

#!/usr/bin/env bash
# Transfer both retained upstream checkouts, including the small local ws patch.
set -euo pipefail
source_root=${1:?Usage: package-sources.sh /absolute/implementation-sources /absolute/output.tar.gz}
archive=${2:?Provide an output archive}
[[ "$source_root" = /* && "$archive" = /* ]]
COPYFILE_DISABLE=1 tar --exclude='._*' --exclude=node_modules --exclude=target \
  --exclude=.pnpm-store --exclude=.devenv -czf "$archive" -C "$source_root" lila lila-ws

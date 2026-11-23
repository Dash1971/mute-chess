#!/usr/bin/env bash
set -euo pipefail
# Run on the dedicated host after building/testing as an unprivileged user.
# Arguments: build directory, matching source archive. Existing games are voided on restart.
build_dir=$(realpath "${1:?build directory required}")
source_archive=$(realpath "${2:?matching source archive required}")
test -f "$build_dir/dist/main.js"
test -f "$build_dir/public/app.js"
test -f "$build_dir/pnpm-lock.yaml"
release_id=$(sha256sum "$source_archive" | cut -c1-16)
release_dir="/opt/club-maia/releases/$release_id"
sudo install -d -m 755 /opt/club-maia/releases
if ! sudo test -d "$release_dir"; then
  sudo mkdir "$release_dir"
  sudo cp -a "$build_dir/." "$release_dir/"
  sudo rm -rf "$release_dir/.scratch" "$release_dir/.git"
  sudo cp "$source_archive" "$release_dir/source.tar.gz"
  sudo chown -R root:root "$release_dir"
fi
# Never replace an unexpected real directory.
if sudo test -e /opt/club-maia/app && ! sudo test -L /opt/club-maia/app; then
  echo 'Expected /opt/club-maia/app to be a release symlink; inspect the existing directory first.' >&2
  exit 1
fi
sudo ln -s "$release_dir" /opt/club-maia/app.next
sudo mv -Tf /opt/club-maia/app.next /opt/club-maia/app
sudo install -m 644 "$release_dir/deploy/club-maia.service" /etc/systemd/system/club-maia.service
if ! sudo test -f /etc/club-maia.env; then
  sudo install -m 600 "$release_dir/.env.example" /etc/club-maia.env
fi
sudo systemctl daemon-reload
sudo systemctl enable club-maia
sudo systemctl restart club-maia
printf 'Installed release %s\n' "$release_id"

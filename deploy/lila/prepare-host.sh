#!/usr/bin/env bash
# Private development tools only; leaves club-maia.service and its data alone.
set -euo pipefail
task_root=${1:?Usage: prepare-host.sh /absolute/development/directory}
[[ "$task_root" = /* && "$task_root" != / ]] || exit 2
mkdir -p "$task_root"/{tools,logs,data,config,sources}
export PATH="/opt/club-maia/node-v24.22.1-linux-x64/bin:$task_root/tools/pnpm/node_modules/.bin:$PATH"
java --list-modules | grep '^jdk.compiler@'
java -version
node --version

fetch_verified() {
  local url=$1 destination=$2 algorithm=${3:-sha256} expected
  curl --fail --silent --show-error --location --retry 3 "$url" -o "$destination.part"
  curl --fail --silent --show-error --location --retry 3 "$url.$algorithm" -o "$destination.$algorithm"
  expected=$(awk '{print $1}' "$destination.$algorithm")
  case "$algorithm" in
    sha1) [[ "$expected" =~ ^[a-fA-F0-9]{40}$ ]] ;;
    sha256) [[ "$expected" =~ ^[a-fA-F0-9]{64}$ ]] ;;
    *) exit 2 ;;
  esac
  printf '%s  %s\n' "$expected" "$destination.part" | "${algorithm}sum" --check
  mv "$destination.part" "$destination"
}

fetch_verified https://repo.maven.apache.org/maven2/org/scala-sbt/sbt-launch/2.0.11/sbt-launch-2.0.11.jar "$task_root/tools/sbt-launch-2.0.11.jar" sha1
if [[ ! -x "$task_root/tools/mongodb/bin/mongod" ]]; then
  fetch_verified https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2404-8.0.34.tgz "$task_root/tools/mongodb-8.0.34.tgz"
  mkdir -p "$task_root/tools/mongodb"
  tar -xzf "$task_root/tools/mongodb-8.0.34.tgz" --strip-components=1 -C "$task_root/tools/mongodb"
fi
if [[ ! -x "$task_root/tools/pnpm/node_modules/.bin/pnpm" ]]; then
  npm install --prefix "$task_root/tools/pnpm" --no-audit --no-fund pnpm@12.9.0
fi
if [[ ! -x "$task_root/tools/mongosh/node_modules/.bin/mongosh" ]]; then
  npm install --prefix "$task_root/tools/mongosh" --no-audit --no-fund mongosh@2.14.0
fi
mkdir -p "$task_root/tools/redis-packages" "$task_root/tools/redis"
if [[ ! -x "$task_root/tools/redis/usr/bin/redis-server" || ! -f "$task_root/tools/redis/usr/lib/x86_64-linux-gnu/liblzf.so.1" ]]; then
  (
    cd "$task_root/tools/redis-packages"
    apt-get download redis-server redis-tools liblzf1
    for package in ./*.deb; do dpkg-deb --extract "$package" "$task_root/tools/redis"; done
  )
fi
export LD_LIBRARY_PATH="$task_root/tools/redis/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
pnpm --version
"$task_root/tools/mongodb/bin/mongod" --version
"$task_root/tools/redis/usr/bin/redis-server" --version

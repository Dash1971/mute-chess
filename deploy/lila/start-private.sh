#!/usr/bin/env bash
set -euo pipefail
task_root=${1:?Usage: start-private.sh /absolute/development/directory [data|ws|app]}
component=${2:-app}
export LD_LIBRARY_PATH="$task_root/tools/redis/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
start_unit() {
  local name=$1 memory=$2
  shift 2
  if systemctl --user is-active --quiet "$name"; then return; fi
  systemd-run --user --collect --unit "$name" \
    --property="WorkingDirectory=$task_root/sources/lila" \
    --property=NoNewPrivileges=yes --property="MemoryMax=$memory" \
    --property=Restart=on-failure --property=RestartSec=5 \
    --setenv="LD_LIBRARY_PATH=$LD_LIBRARY_PATH" "$@"
}
start_unit nosweat-lila-mongo 1G "$task_root/tools/mongodb/bin/mongod" \
  --bind_ip 127.0.0.1 --port 27018 --dbpath "$task_root/data/mongo" \
  --wiredTigerCacheSizeGB 0.25 --logpath "$task_root/logs/mongodb.log" --logappend
start_unit nosweat-lila-redis 256M "$task_root/tools/redis/usr/bin/redis-server" "$task_root/config/redis.conf"
if [[ "$component" == data ]]; then exit; fi
[[ "$component" == app || "$component" == ws ]] || exit 2
[[ -d "$task_root/sources/lila-ws/target/universal/stage/lib" ]]
start_unit nosweat-lila-ws 768M /usr/lib/jvm/java-21-openjdk-amd64/bin/java \
  -Xms64m -Xmx384m -XX:ActiveProcessorCount=2 \
  "-Dconfig.file=$task_root/config/ws.conf" \
  -cp "$task_root/sources/lila-ws/target/universal/stage/lib/*" lila.ws.LilaWs
if [[ "$component" == ws ]]; then exit; fi
[[ -d "$task_root/sources/lila/target/universal/stage/lib" ]]
start_unit nosweat-lila-app 3G /usr/lib/jvm/java-21-openjdk-amd64/bin/java \
  -Xms256m -Xmx2g -XX:ActiveProcessorCount=3 \
  "-Dconfig.file=$task_root/sources/lila/conf/application.conf" \
  "-Dplay.server.dir=$task_root/sources/lila" -Dplay.mode=dev \
  -cp "$task_root/sources/lila/target/universal/stage/lib/*" lila.app.Lila "$task_root/sources/lila"

#!/usr/bin/env bash
set -euo pipefail
task_root=${1:?Usage: build.sh /absolute/development/directory ui|lila|ws}
component=${2:?Select ui, lila or ws}
export PATH="/opt/club-maia/node-v24.22.1-linux-x64/bin:$task_root/tools/pnpm/node_modules/.bin:$PATH"
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
case "$component" in
  ui)
    cd "$task_root/sources/lila"
    pnpm install --frozen-lockfile
    (cd ui/.build && pnpm install --frozen-lockfile)
    ./ui/build --no-install
    ;;
  lila|ws)
    source_dir=lila
    heap=5g
    processors=3
    if [[ "$component" == ws ]]; then
      source_dir=lila-ws
      heap=2g
      processors=1
    fi
    cd "$task_root/sources/$source_dir"
    exec nice -n 10 "$JAVA_HOME/bin/java" -Xms256m "-Xmx$heap" -Xss2m \
      "-XX:ActiveProcessorCount=$processors" -Dsbt.task.cpus=2 -Dsbt.supershell=false \
      -Dsbt.log.noformat=true -jar "$task_root/tools/sbt-launch-2.0.11.jar" stage
    ;;
  *) exit 2 ;;
esac

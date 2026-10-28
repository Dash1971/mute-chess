#!/usr/bin/env bash
# Run only against the separate private development checkout.
set -euo pipefail
task_root=${1:?Usage: configure.sh /absolute/development/directory}
[[ "$task_root" = /* && "$task_root" != / ]] || exit 2
mkdir -p "$task_root"/{config,data/mongo,data/redis,logs}
umask 077
if [[ ! -f "$task_root/config/secrets.conf" ]]; then
  python3 - "$task_root/config/secrets.conf" <<'PY'
import base64, json, secrets, sys
keys = ["user.password.bpass.secret", "play.http.secret.key",
        "security.password_reset.secret", "security.email_confirm.secret",
        "security.email_change.secret", "security.login_token.secret",
        "security.turnstile_cookie.secret", "storm.secret"]
with open(sys.argv[1], "x") as output:
    for key in keys:
        value = (base64.b64encode(secrets.token_bytes(32)).decode()
                 if key == "user.password.bpass.secret" else secrets.token_urlsafe(48))
        output.write(key + " = " + json.dumps(value) + "\n")
PY
fi
python3 - "$task_root/config/secrets.conf" <<'PY'
import base64, json, sys
with open(sys.argv[1]) as source:
    values = dict(line.strip().split(" = ", 1) for line in source if line.strip())
key = base64.b64decode(json.loads(values["user.password.bpass.secret"]), validate=True)
if len(key) not in (16, 24, 32):
    raise ValueError("Existing password encryption key has an invalid AES size; do not rotate a key used by stored accounts")
PY
cat > "$task_root/sources/lila/conf/application.conf" <<EOF
include "base"
include "version"
include required(file("$task_root/config/secrets.conf"))
include file("$task_root/config/nosweat.conf")
play.server.dir = "$task_root/sources/lila"
play.server.http.address = "127.0.0.1"
play.server.http.port = 19663
mongodb.uri = "mongodb://127.0.0.1:27018/nosweat_lila_dev?appName=nosweat-lila-dev"
redis.uri = "redis://127.0.0.1:16379"
net.domain = "127.0.0.1:19663"
net.socket.domains = ["127.0.0.1:19664"]
net.base_url = "http://127.0.0.1:19663"
net.site.name = "No Sweat Chess"
net.crawlable = false
play.http.session.cookieName = "nosweatliladev"
play.http.session.maxAge = 7 days
net.http.log = false
mailer.primary.mock = true
mailer.secondary.mock = true
EOF
(
  cd "$task_root/sources/lila"
  TZ=UTC git log -1 --date=iso-strict-local --pretty='format:app.version.commit = "%H"%napp.version.date = "%ad"' > conf/version.conf
)
cat > "$task_root/config/ws.conf" <<EOF
include "application"
include required(file("$task_root/config/secrets.conf"))
http.host = "127.0.0.1"
http.port = 19664
http.use-nginx-forwarded-ip = false
mongo.uri = "mongodb://127.0.0.1:27018/nosweat_lila_dev?appName=nosweat-lila-ws-dev"
redis.uri = "redis://127.0.0.1:16379"
csrf.origin = "http://127.0.0.1:19663"
cookie.name = "nosweatliladev"
netty.threads = 2
EOF
cat > "$task_root/config/redis.conf" <<EOF
bind 127.0.0.1
port 16379
protected-mode yes
dir "$task_root/data/redis"
appendonly yes
maxmemory 128mb
maxmemory-policy noeviction
EOF

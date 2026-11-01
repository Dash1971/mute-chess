# Public bot activity

Automatic public play is a product mode in the existing native admission service
and Maia adapter. It is disabled by default; this change does not start games.
It adds no service, study runner or deployment/maintenance framework.

When `nosweat.activity.enabled = true`, ordinary pool play has a ten-game global
ceiling. Up to five of those games are automatic, rated BOT-versus-BOT games.
Human games may use every remaining slot; automatic games never displace an
active human game and cannot consume the five slots reserved by their target.
Friend games retain their existing separate native admission path.

Successful automatic admissions alternate 5+3 Blitz and 10+5 Rapid. The first
seat is uniformly random among available managed accounts. Its opponent is
uniformly random among available, enabled accounts within 200 points of its
current native rating for that speed. Both seats count as busy in ordinary
matchmaking. The shared native sequencer prevents duplicate seats and admission
races; the native game repository checks the exact reserved BOT seats.

Each seat freezes the same model inputs, move-history switch, sampling settings,
seed and timing style used by its ordinary policy. The separately versioned
`public-bot-human-timing-v1` wrapper enables the existing human timing calculation
for these automatic games, including accounts whose persistent timing switch
is off. It leaves that stored switch unchanged. Timing includes inference and
queue time and retains the existing low-clock protection. Studies retain their
separate no-added-wait contract.

The existing adapter uses one shared worker with no more than two outstanding
inference requests. Its bounded queue gives human turns two of every three
contested dispatch slots, serves FIFO within each class, and keeps artificial
clock waits outside inference slots. Automatic games use the existing
`nosweat_game` records, `/games` boards, watcher routes, PGN/history and native
Glicko updates. No ratings are reseeded or recalculated outside native results.
Random activity across 10,000 accounts gives uneven, gradual rating refresh; it
is not a new calibration or establishment experiment.

## Manual pause and drain

The controls are authenticated internal routes, blocked by the existing public
gateway. Use the established root/operator access to the loopback native app;
keep the bearer token out of command output and shell history. With the existing
`ADAPTER_TOKEN` already supplied securely in the operator environment:

```sh
curl --fail --silent --show-error http://127.0.0.1:29663/club/internal/activity \
  -H 'Host: mutechess.org' -H "Authorization: Bearer $ADAPTER_TOKEN"
curl --fail --silent --show-error http://127.0.0.1:29663/club/internal/activity \
  -H 'Host: mutechess.org' -H "Authorization: Bearer $ADAPTER_TOKEN" \
  -H 'Content-Type: application/json' --data '{"paused":true}'
```

Pause persists in the `nosweat_activity` control document. It prevents only new
automatic admissions: current games continue receiving moves, finish naturally
and keep their ordinary results. Status identifies its `scope` as `maia-pool` and reports `enabled`, `paused`, `active`,
`target`, `totalActive`, `capacity`, `draining` and `drained`. Wait until `drained`
is true before the existing maintenance procedure; that field concerns automatic
games, so human/friend games still require the existing active-game checks.
Resume with the same POST and `{"paused":false}` after maintenance. There is no
scheduled window or automatic restart of paused activity.

Enabling automatic play and bounded studies together is rejected. Existing
application/adapter failure handling still voids unfinished games instead of
fabricating results; manual pause does not trigger that handling. A failed
candidate/policy admission does not prevent polling already active games.

Validation covers queue bounds, human preference without background starvation,
immutable automatic timing, old study contracts, native cap/pause/speed rules,
Scala formatting/compilation and exact patch reconstruction. Native runtime and
watcher smoke checks remain required before activation. No public load run is a
release check.

The same bounded release also corrects the focused profile timeline signup text
from `lichess.org` to `mutechess.org`, retaining the translated native entry and
upstream rendering outside the focused site.

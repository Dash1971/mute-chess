# Public bot activity

Automatic public play is a product mode in the existing native admission service
and Maia adapter. It is disabled by default; this change does not start games.
It adds no service, study runner or deployment/maintenance framework.

When `nosweat.activity.enabled = true`, ordinary Maia pool play has a twenty-game
shared ceiling for human-versus-Maia and rated BOT-versus-BOT games (#300).
Background play only fills up to five total unfinished native games, including
human-versus-human friend games and excluding imported replays. With three human
games, it maintains at most two background games; with five or more human games,
it starts none. The count comes from native game state, not connected game rooms.
Existing games finish naturally when human activity rises; new background games
resume as the total drops below five. Humans can ultimately use all twenty Maia
slots. Friend games retain their separate native admission path and do not consume
the Maia cap, but do suppress background top-ups. The current Maia games page can
display all twenty pool games.

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
inference requests and at most twenty waiting requests. Its bounded queue gives human turns two of every three
contested dispatch slots, serves FIFO within each class, and keeps artificial
clock waits outside inference slots. Each successful native poll invalidates
waiting work whose game disappeared, whose ply changed, or whose bot turn ended.
Running results and delayed submissions are checked against that latest poll;
native stale-ply validation remains authoritative. Obsolete turns and temporary
queue saturation use the neutral retry path, without failing the native game.
Automatic games use the existing
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

For the first activation, install the backend with
`nosweat.activity.enabled = false` and issue the pause POST above **before the
first enabled start**. That endpoint works while the feature is disabled and
persists `{ "_id": "public", "paused": true }` in `nosweat_activity`; no direct
database command is needed. Verify `paused: true`, `active: 0`, and `drained: true`.
Then enable the existing application setting and restart through the existing
release procedure. Confirm `enabled: true`, `paused: true`, `active: 0`, and
`capacity: 20`, plus service health and preserved ratings/history, before the
explicit resume POST with `{"paused":false}`. An enabled start without a saved
pause document defaults to unpaused and can create games on the first adapter
poll, so do not enable the setting before initializing that control.

Pause persists in the existing `nosweat_activity` control document, including
across application restarts. The same authenticated POST now pauses **all new
playable native games**, not just automatic Maia games. Human-versus-Maia starts,
friend invitations, rematches and enabled study starts share the native insertion
guard. A pause waits for an insertion already in progress before acknowledging;
future insertions fail without creating or aborting a game. Existing games keep
receiving moves and finish with their native clocks, results and ratings. Returning
to an already active Maia game and importing a finished/replay PGN remain allowed.

Status now reports `scope: "all-games"`. `active` remains the automatic-game count
for compatibility; `totalActive` is the primary database count of all unfinished
native games, excluding PGN imports. `poolPending` and `studyPending` include their
reserved/active records. Require `paused: true` and `drained: true` before rebooting;
`drained` is true only when all three counts are zero. `draining` identifies a
saved pause with remaining games/records. A database read failure is an error,
not an empty/healthy drain. Stale reservations require investigation, not fabricated
results or automatic deletion.

For the owner's small preproduction deployment, keep security updates prompt.
When Ubuntu reports `/var/run/reboot-required`, OpenClaw can save the pause, poll
until games finish, reboot, check ordinary service/site health, then POST
`{"paused":false}`. The saved pause stays in effect after boot until resumed.
Package updates can independently restart services without requiring a reboot;
brief interruptions are accepted. There is no backup requirement, scheduled window
or automatic reboot implemented by this admission control. General updater and
backup jobs remain separate operations work.

Enabling automatic play and bounded studies together is rejected. Existing
application/adapter failure handling still voids unfinished games instead of
fabricating results; manual pause does not trigger that handling. A failed
candidate/policy admission does not prevent polling already active games.

Validation covers queue bounds, human preference without background starvation,
resign/flag/finish churn, obsolete-ply cancellation, neutral saturation retries,
immutable automatic timing, old study contracts, native cap/pause/speed rules,
Scala formatting/compilation and exact patch reconstruction. Native runtime and
watcher smoke checks remain required before activation. No public load run is a
release check.

The same bounded release also corrects the focused profile timeline signup text
from `lichess.org` to `mutechess.org`, retaining the translated native entry and
upstream rendering outside the focused site.

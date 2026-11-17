# Weekly community Arenas

**Status:** owner-hosted Arenas (#313/#320) and native discovery (#325) are deployed.
The compact sidebar follow-up in #326 is draft only and is being held for a later
batch release. Original draft implementation/validation notes below are historical;
this follow-up starts no event and changes no live service or bot pool.
The Arena feature supersedes the one-human-per-Arena proposal in #84.

## Event setup

| Setting | Initial choice |
| --- | --- |
| Host | Owner-authorized human account; creation is not open to everyone |
| Format | Native Lichess Arena, standard chess, normal initial position |
| Duration | 120 minutes |
| Clock | 15+10 Rapid by default; editable per event through native controls |
| Entry | Signed-in human accounts, including new Nostr accounts; spectators can browse |
| Human limit | None imposed by the configurable filler target |
| Bot roster | Configurable saved event-speed rating range, default 1400–1700; roster size matches the active participant target (default ten, allowed 1–20) |
| Bot timing | Human timing enabled, including low-clock protection |
| Scoring and standings | Native mixed human/BOT standings and scoring |
| Recurrence | Host creates each weekly event manually; no new recurring scheduler |

Use the existing native tournament page, shareable URL, join/pause/rejoin,
standings, chat controls, spectator boards and account identity. Tournament
creation, editing and cancellation remain owner-authorized; ordinary human entry
uses native authentication, blocking, playban and tournament eligibility checks.
Bulk tournament exports remain unavailable: their native controls are hidden
while the affected API routes remain blocked. Individual game exports retain
their existing behavior.

Do not impose an established-rating requirement that excludes new visitors by
default. Preserve other native abuse checks.

The initial bot band refers to **saved playing ratings**, not Maia model input.
Select a spread within the configured band, centered on its midpoint, once when preparing the
event. Freeze those identities for its duration. Earned ratings may move outside
the band during play; do not replace bots mid-event or reset their ratings.
If the configured number of eligible bots cannot be reserved, show the shortage to the host rather
than creating accounts, changing ratings or silently widening the band.

## Configurable fillers and human-only events (#319, draft)

The owner-approved follow-up to merged #313 adds **Allow bot accounts**, a minimum
and maximum saved rating (400–3200), and an active participant target (1–20).
The default band is 1400–1700 and the default target is ten. These are per-event
settings; the native Arena clock remains independently editable before preparation.
The bounded participant target does not raise the existing shared game cap.

Unchecking bots hides the bot-specific controls and creates a human-only event.
Native bot entry checks remain enforced. The host still clicks **Prepare Arena**
to activate the event lifecycle with an empty bot roster; this reserves no bots
and uses no inference slots. Preparation does not start play early. For events
with fillers, **Prepare Arena bots** reserves the configured roster. Both modes
suppress new ordinary background bot games until all event games have drained.

After preparation or start, bot settings, clock and rated mode are locked; names,
descriptions and other compatible native edits remain available. To change the
reserved roster configuration, cancel and create a new event. A participant notice
uses the actual target and explains that bots stop receiving new pairings when
that many humans remain active, while games already underway finish normally.
Arena spectator lists, the pairing banner and top-game labels show chosen public
names, keeping permanent IDs for links and pairing. Standings, podium, player
cards and chat retain the existing public-name paths. The native status lookup
for spectator labels is read-only, batched and safely renders names as text.
The host sidebar omits the repeated explanatory paragraph beneath chat.

All added labels, help, validation, and participant notices use the ten native
translation catalogs. This follow-up remains draft and is not a deployment.

## Compact event sidebar (#326, draft)

The tournament details card replaces the large Maia warning with a collapsed
**Maia bots fill empty seats** row. Click or keyboard-activate the row to expand
its explanation; activate it again to collapse. The text uses this event's saved
bot rating range and active-participant target, and explains that humans replace
bots for new pairings while ongoing games finish normally. Human-only events do
not show this disclosure. Individual BOT tags stay visible.

Only the redundant accepted bots-allowed entry condition is omitted. Other entry
requirements and refusal reasons retain the native eligibility display and checks.
Event descriptions/date use natural height and normal page scrolling instead of
a short internal scroll area. The focused layout retires its old whole-description
collapse control/preference, without changing upstream non-Mute views. Native
chat uses the freed space with a usable minimum height. Host preparation feedback
sits above chat; the small translated Refresh link reloads the event to check
readiness and does not prepare, start or reconfigure it.

All changed text, including the disclosure, draining status and Refresh link,
uses the existing native catalogs in all ten supported locales. This is presentation
only: native chat permissions, owner/CSRF checks, bot settings, game admission,
clocks, ratings, pairings and event lifecycle are unchanged. No merge or deployment
is authorized until a later batch is explicitly approved.

## Participation rule

Let H be the number of active humans in this Arena:

`targetBots = botsAllowed ? max(0, configuredTarget - H) : 0`

The table below illustrates the default target of ten.

| Active humans | Target bots available for pairing |
| ---: | ---: |
| 0 | 10 |
| 1 | 9 |
| 3 | 7 |
| 9 | 1 |
| 10 | 0 |
| 15 | 0; all fifteen humans can participate |

Count a human who is playing an unfinished Arena game or joined and available
in the native Arena waiting pool. Count each account once, not each browser tab.
Registration for a future event and spectating alone do not count. An explicit
pause/withdrawal removes an idle human from H immediately. A playing human still
counts even if disconnected or withdrawn until that game ends.

For idle humans who disappear without withdrawing, retain their place for a
short reconnect allowance before replacing them with a bot. The initial
value is **60 seconds**, using native lobby presence/waiting signals. This is an
Arena participation allowance, not a change to native in-game disconnect claims
or clocks. Rejoining restores participation without resetting points.

Reconcile eligibility before the next pairing batch, not just on a slow display
refresh. Humans are always admitted; the configured participant target limits filler
bots, not human registrations or human-versus-human games.

## Withdrawing and returning bots

Use native tournament standing order, including its tie-breaking, rather than
model Elo or account rating. Use fixed roster order to break ties before any
standing exists.

- When H increases, withdraw the lowest-standing bots from future pairings first.
- Let every game already started finish normally. Withdrawal must not resign,
  abort, flag, delete or reassign its result.
- A bot finishing a game after withdrawal remains unavailable for new pairings.
- When H decreases, return the highest-standing withdrawn bots first, preserving
  their points, streak state and native tournament identity.
- Do not admit replacements for a retiring bot merely because it was withdrawn:
  include its unfinished game when checking occupied seats and engine capacity.
- Never seat one bot in two games, another event or ordinary quick pairing at the
  same time. Reserve the whole event roster until the event's bot games drain.

The configured number (ten by default) is a **steady-state participation target**. Human arrivals can temporarily
put the number of playing/available participants above the target while withdrawn bots
finish games. At 15+10 this transition can take a substantial time; do not promise
instant replacement or interrupt a human's game to enforce the target.

Bots remain visibly labeled BOT and can lead or win. Do not rewrite standings
or remove their earned points when they withdraw. A separate human-winner award
or leaderboard would be a later product decision, not an implicit scoring change.

## Background activity and event lifecycle

1. **Create:** save a native future Arena and its owner, settings and roster plan.
   Creating an invitation days ahead must not pause background games for days.
2. **Prepare:** the host explicitly prepares the event. Suppress new ordinary
   background bot-versus-bot admissions and allow existing games to drain; reserve
   the selected roster once it is free. Show readiness before the host starts the
   event or its scheduled countdown reaches zero. Do not globally pause game
   admission: human quick pairing, friend games and Arena games remain usable.
3. **Run:** native Arena start and countdown control play. Bots fill the active
   participant target, including when no humans are present. Keep their managed
   waiting presence alive between games and respect native pairing rules.
4. **Finish or cancel:** stop bot re-entry and new event pairings using native
   tournament lifecycle behavior. Continue serving every existing bot game.
5. **Restore:** release roster reservations after their games finish, then remove
   only this event's background suppression. Respect any independent maintenance
   pause; never unpause the whole site as a side effect.

Initially support one prepared/running/draining managed Arena at a time. Store
its event association and reservations durably so restart recovery can reconcile
native games and tournament state without admitting duplicate seats or leaving
background play suppressed indefinitely. Preserve the existing worker failure
handling; no new fabricated outcomes or tournament-score writes.

With 15+10, games can last more than forty minutes and a two-hour event may have
only a few games per player. Keep Lichess's deadline rule: standings freeze at
zero, unfinished games continue but do not count toward the Arena. The invitation
and native help should make that behavior clear; do not silently extend scoring.

## Native integration boundaries

The implementation adds scoped integration rather than just exposing the tournament route:

- The public gateway currently treats tournaments as unsupported. Permit only the
  native Arena browsing, creation/editing, join/pause, standings/player, chat and
  socket paths needed for this feature. Retain method checks, CSRF, host gating
  and private-path denial; do not open all tournament APIs or other event formats.
- Native `Tournament` forms and controllers provide the host flow. Keep clocks
  configurable, default to 15+10/120 minutes, and enforce standard chess and the
  owner authorization on the server as well as the form. Do not enable Swiss,
  team battles, variants, prizes or arbitrary bot access as incidental additions.
- Native `TournamentApi`, waiting users and player records own joining, pausing,
  rejoining, pairing eligibility, score retention and the end-of-event rule.
  Reconcile the managed roster within the existing per-tournament sequencing.
- Reserve bot seats and validate shared capacity **before committing a native
  pairing batch**. A rejected reservation must not leave an announced pairing
  with no game. Keep native Arena pairing, not the quick-pool ±200 restriction.
- Our game insertion guard currently requires pool/friend/study authorization.
  Add a narrow Arena authorization for the prepared owner event and its exact
  native pairing/seats. Do not accept arbitrary `Source.Arena` games.
- The managed adapter currently polls its admitted `nosweat_game` records, not all
  tournament games. Register Arena bot turns with immutable frozen policies,
  native clocks and the existing worker. Human-versus-human games need no Maia
  record; one- and two-bot games must both work. For a human opponent, reuse the
  playing policy's opponent-rating conditioning and enable human timing.
- Count every Arena game containing Maia toward the existing shared twenty-game
  Maia cap. Human-versus-human games do not consume inference slots. Do not change
  worker count, infrastructure limits or native human game admission here.
- Native game completion remains responsible for chess rules, clock expiry,
  disconnects, rating/history writes and tournament results. Feed completion back
  into managed reservations and waiting eligibility without a second scoring
  system. Include live Arena games in the existing games/spectator views.

Document exact native departures when implementing these hooks. Use existing
translation catalogs for any added help, readiness, status, error or accessibility
text in all ten supported locales. Reuse native translated Arena UI wherever
possible. No deployment, backup, monitoring or scheduling framework is part of
this feature.

## Browser/event coverage requirements

Execution results for these checks are recorded on draft PR #313. This list
defines coverage; it is not a claim that the feature is live.

- Owner creates an event with 15+10 and 120-minute defaults, can choose a
  different supported clock next week, and obtains a shareable native URL.
- Non-owner creation/edit/cancel and forged event/pairing/bot reservations fail.
- Only existing eligible 1200–1700 bots enter the fixed roster; their saved
  ratings, identities and ordinary timing preferences are not overwritten.
- H = 0, 1, 3, 9, 10 and 15 produce the specified target; late registration,
  spectators, duplicate tabs, explicit pause and reconnect are handled correctly.
- A human arrival blocks a retiring bot's next pairing without ending its
  existing game. A rapid leave/rejoin cannot create duplicate seats.
- Returning bots follow native standing order and retain points and history.
- Human/human, human/bot and bot/bot pairings finish through native results;
  bot turns use the configured worker, human timing and normal clock protection.
- Capacity contention cannot publish a pairing that has no playable game or
  starve human-versus-human Arena pairings.
- Preparing the Arena suppresses background admissions without closing human
  play. End, cancellation and restart recovery restore only event-owned state.
- The deadline stops further scoring/pairing while existing games finish;
  only then are occupied bots released and background activity restored.
- Native Arena assets, sockets, public names/BOT labels and required routes
  work in the actual browser; new UI text passes ten-locale parity/render checks.

## Draft validation

The isolated native build passed application compilation and Scala formatting.
The six participation/reconnect tests, five native pairing-admission tests, two
saved-rating roster tests, and one native translation-render test passed. The
last test renders all six added strings in all ten supported locales. The Arena
UI build passed TypeScript checking, bundling, styles and translation generation.
All 120 existing/new adapter regressions passed, including Arena frozen policy,
human timing, gateway methods/sockets and denial of the affected tournament API
exports. Native patch reconstruction and the departure-register checks passed.

Browser testing uses a fresh private database and the existing native app,
WebSocket service and real 79M worker. It has exercised the host form defaults
and configurable clock/duration, ten saved-rating bot seats, non-owner refusals,
the 0/1/3/9/10/15-human participation matrix, duplicate tabs, spectators, explicit
pause/rejoin and idle reconnect expiry. Real bot/bot and human/bot games progressed,
a human moved on the browser board, and twenty simultaneous Maia games refused
the next admission.

This caught a configuration-loader bug at the actual native game-insertion
boundary: the host setting was interpreted as a list of objects. Admission now
uses the native string-sequence loader, with an executable regression for the
documented canonical-ID string list and the absent-setting default. The corrected
application was rebuilt and the private game tests resumed on that source.

The PR's validation record contains the detailed lifecycle/scoring outcomes and
screenshots. Private test games and identities never enter the public database.
No live configuration or service state is changed, and these checks authorize
neither merging nor deploying the draft.

## References

- [Native Arena rules](https://lichess.org/tournament/help).
- [Pinned tournament implementation](https://github.com/lichess-org/lila/tree/b551752d2a0e7a63459d9812825d95a633a98737/modules/tournament/src/main).
- [Existing background activity and shared capacity](public-bot-activity.md).
- [Feature and site behavior manual](site-manual.md).
- [Upstream alignment and departure policy](upstream-alignment.md).

## Host configuration and use

The feature is gated by the native `nosweat.arena.hosts` configuration list, which
defaults to empty. An operator must explicitly list the owner’s **canonical
account ID**, not the editable display name. This PR does not change live config
or grant any moderator/OAuth permissions.

After a reviewed release, open **Play → Arena tournaments**. Authorized
hosts can create an event with the native form, change its clock or start date,
and share the resulting URL. Open the event and choose **Prepare Arena bots**
before its start time. Preparation reserves ten existing eligible identities and
suppresses background admissions; it does not globally pause games. Refresh the
event to check whether background games have finished draining. Only one event
can hold that preparation reservation at a time.

The new `NoSweatArena` helper manages the filler seats and the singleton
`nosweat_arena` preparation record. `NoSweatService` retains the existing shared
admission queue and immutable bot-policy records. Native Arena insertion checks
the authorized event, native pairing and exact reserved bot seats. The adapter’s
versioned Arena timing wrapper preserves each bot’s configured policy and enables
human timing without overwriting it. The source register records the exact
patched paths.

Validation results and remaining browser acceptance checks are recorded in the
draft PR. No merge, deployment or live event is authorized by this implementation.


### Security follow-up stacked on this draft (#314)

The follow-up backports the upstream tournament visibility fix for games/results/teams exports and the broadcast source-address validation fix. It retains this draft's owner-event gate, gateway API denial and hidden export controls; no API route is opened. The source inventory's tournament advisory decision becomes a backported source target when the follow-up is included. The earlier draft-only unpatched status above remains historical validation context. Merge #313 before the follow-up and verify/deploy the combined final main once. The moderator-token advisory is outside this follow-up.


## Discovery alignment (#324, draft)

The Arena index reuses the native Lichess schedule/timeline and Finished table.
Its selection contains public, standard, non-position, non-team Arenas from the
existing configured hosts only. Upcoming events enter the timeline data within
six hours of starting; active events are included; the latest twenty finished
events supply the Finished table. The native browser timeline clips events whose
scheduled finish is more than three hours ago. The Finished table has no age
expiry: an older result leaves it when twenty newer events supersede it.

Older public results remain in the native paginated Arena history (twenty per
page); the native calendar exposes future host events up to a year ahead. Results
and event URLs are retained. Private Arenas and events by unapproved hosts never
enter these discovery pages, their JSON, or schedule socket messages. Hosting,
private direct access, bot preparation, clocks, pairings and ratings retain their
existing permissions and behavior.

Play → Arena tournaments replaces the Community entry. The existing native
homepage spotlight card sits at the upper left of quick pairing on desktop, above
it on smaller screens. It shows the next public host Arena within the native
24-hour maximum feature horizon, or an active one while native late-entry rules
still consider it worth joining. It uses the native event icon, player count,
countdown/in-progress label and direct Arena URL. No eligible event means no card
or empty side column. Quick pairing and the homepage counters retain their normal
behavior.

The host events do not carry Lichess's official schedule metadata. A focused
snapshot mode in the native schedule client therefore replaces the complete
host-only data on reload, avoiding the upstream team-event merge keeping stale or
duplicate unscheduled host events. Non-Mute schedules keep their original path.
Reused UI keys are checked through the native registry in all ten supported
locales; calendar date tooltips use the document locale. No new UI catalog key,
service, scheduler, deployment procedure or database migration is introduced.

This discovery follow-up is a draft PR. It is not merged or deployed.

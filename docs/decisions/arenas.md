# Owner decision record: arenas

Historical instructions retained from AGENTS.md. Read the [current rules](../../AGENTS.md)
first; later owner instructions supersede earlier conflicting entries.

## Owner-hosted Arenas (November 13, 2026, #311/#313)

The owner authorized implementing native standard-chess Arenas in draft PR #313,
without merging or deploying. Default to 120 minutes and 15+10; reserve ten
existing bots with saved event-speed ratings of 1200–1700. Bots fill a target of
ten active humans plus bots, while human entry remains unlimited. Use native
pairing, scoring, clocks and results; finish ongoing games before releasing bot
seats. Suppress only ordinary background bot games during preparation/event/drain,
respect independent maintenance pauses, and retain the shared twenty-Maia-game
cap. Follow docs/arena-plan.md and the exact-path departure register. No new
scheduler, deployment tooling or infrastructure changes are authorized.


## Configurable Arena fillers (November 13, #319)

The owner approved a draft follow-up to merged #313: make Allow bot accounts
authoritative for human-only events and expose each event’s bot rating range
(default 1400–1700) and active participant target (default ten). Use the actual
target in the Maia participation notice, preserve ongoing games and unlimited
human entry, and translate all UI text into ten locales. Keep this follow-up
draft; do not merge or deploy without further instruction.


## Native Arena discovery (#324, November 13)

The owner approved a draft PR for the native timeline and Finished/history views,
Play → Arena tournaments, and an upper-left homepage Arena spotlight. Reuse native
views and timing, retain public approved-host filtering and all Arena admission
semantics, and verify all exposed copy in ten locales. Keep this draft unmerged
and undeployed pending further instruction. No general tooling or infrastructure
changes are authorized.


## Compact Arena sidebar (#326, November 14)

The owner approved the compact sidebar preview: native bot-details disclosure,
full-height metadata, native chat breathing room and preparation feedback above
chat. Preserve real entry requirements/refusals and every game/host/bot contract;
translate all changed text in ten locales. Keep the PR draft, unmerged and
undeployed for a future explicitly approved batch. Do not pause public games,
stop public services or add release/infrastructure tooling for this UI change.

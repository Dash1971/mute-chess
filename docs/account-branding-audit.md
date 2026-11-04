# Focused account and onboarding branding audit (#258)

This PR follows the owner's screenshot of the zero-game profile welcome. It is
PR-only: no merge, release build, deployment, database change or service operation.

## Exposed copy corrected

| Surface | Finding | Focused behavior |
| --- | --- | --- |
| Signed-in new-player profile | Lichess welcome, follow and settings text | Mute Chess welcome and translated actions |
| Welcome play suggestions | Native AI/human-lobby anchors do not describe the Maia pool | One link to normal Maia quick pairing |
| Welcome navigation | Kid mode, tournaments and video destinations are not exposed by the gateway | Omit those suggestions; keep rules, puzzles, player discovery, analysis and settings |
| Native challenge invitation | Heading says “Lichess user” | Invite a Mute Chess player; preserve the existing form and account/ownership checks |
| Study help tour | Title says “Lichess Study” | Native tour receives focused translated title/text in its page options |
| Forum index | Native preview title/description identify Lichess; visible Mute heading is hard-coded English | Use native translated Mute label/description |

The normal upstream branches retain their original welcome, links, invitation
and tour copy. No routes, privileges, invitation actions, puzzle behavior or study
state are added or changed. New and changed copy uses the existing native catalogs
in all ten supported locales, including the study tour and forum metadata.

## Already corrected and retained references

The audit also checked the shared page renderer, public homepage/profile/analysis
previews, manifest, missing-player copy, puzzle previews and organization metadata
against #244/PR257. Those remain in place.

Lichess attribution is retained in About/Donate, the source/licenses, and the
CC0 puzzle database credit and its real external resources. Technical identifiers,
font names and upstream package names are not product self-branding.

Source strings in the blocked native account deletion/personal-data/kid screens,
online-bot listing, videos and diagnostics are not changed or newly exposed. The
welcome no longer advertises those unsupported destinations. Coach/streamer
awards remain native role content rather than claims that Mute Chess operates
Lichess programs. This is a focused source-and-route audit, not a claim that every
unreachable upstream string has been rewritten.

## Validation

Review the constructor defaults and focused conditionals, current gateway allowlist
and route targets, native formatter/lint output, exact maintained patch/departure
coverage and ten-catalog key/placeholder parity. The ordinary PR CI handles native
compilation and UI checks. No local full build or live acceptance is claimed.

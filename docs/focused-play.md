# Focused Mute Chess experience

Owner decision, October 29, 2026 (#55/#56). The visible flow is Nostr login,
choose a time control, play Maia, browse games on your profile, and analyze.
Keep the native quick-pair grid and Custom dialog. Pair directly through the
existing bot pool; no lobby listing, opponent picker, invented availability or
fake activity. Anonymous games remain casual. Keep Puzzles, Community, Tools (analysis, editor, PGN
import), Donate, profile and settings in the header. Hide Play, Learn and Watch menus,
notification icons, updates, daily puzzles, events and
tournament promotions. Previously enabled native features remain accessible by
their URLs; this decision supersedes their prominent navigation treatment.

Moves by Rating belongs on the analysis board: a fixed 0–100% chart of the leading
three raw Maia policies across 600–2600 at 100-point intervals. Hold opponent
conditioning fixed. Reuse bounded browser inference/cache; invalidate data on
position/history/opponent/model changes and cancel stale sampling. Expand the
probability table for exact values. The native analysis toggle is the only on/off
control; remove the extra Pause button and the explanatory boilerplate.

The donation page needs a visible close link to the home grid, concise copy and
properly spaced form/QR/actions. Payment matching, invoices and receipt validation
are unchanged. Signed-in humans can post in the forum immediately (#81), with
native category permissions, moderation and anti-spam controls.

The footer offers About, FAQ, Contact, Terms and Privacy, plus actual source and
social links. The owner explicitly chose the official Nostr identity as the contact
channel, without email, corporate identity or chosen jurisdiction. Do not invent
those details or present this copy as jurisdiction-specific legal advice/review.
Document actual data storage and third-party services without fabricated retention
periods, deletion guarantees or organization claims from Lichess. Remove Mobile App
and Block ads links. The opening explorer remains deferred (#42).

The owner's final correction (#57) retains native Friends, follow/block controls,
and the challenge dropdown. Signed-in players can invite one another to standard
chess through profiles/hovercards. These invitations use native challenge ownership,
preferences, blocks, round/clock/rating/history logic, not the Maia admission queue.
Reject anonymous/open challenges, self challenges, variant challenges and manually
selected bot opponents. Native API-token/challenge endpoints remain unavailable.
The quick-pair grid and Custom Play stay bot-only; no public human matchmaking.
The compact profile menu retains profile editing, game export and Friends, without
advertising the deferred opening explorer or unsupported inbox/gifting features.


Nostr sign-in starts with Create a key and play. Show the masked nsec backup with
Copy/Show controls, explain saving it in a password manager, then save locally and
play. Retain existing-nsec import, the saved-key return path and a secondary NIP-07
signer button/recommendation. Do not show 2FA until a verified signed login reports
`two_factor_required`; a generic error must not reveal account security state. Each
retry signs a fresh challenge bound to the code, and local keys are saved only
after successful authentication. Clear pending key copies/codes on account switch
and page exit. Existing identities remain stable and do not become new accounts
when their nsec or signer is used again. See #59.

## October 31 header corrections (#122/#124)

Restore native header search for finding friends. Keep the native autocomplete,
profile navigation and invitation behavior; quick pairing stays Maia-only. The
Mute Chess header opts into an enabled-account public-name/handle prefix query,
limited to ten results. Terms are 2–30 characters, with controls rejected and
regex punctuation escaped; Unicode and spaces in public names are supported.
The native NoTor boundary remains. Labels use escaped display names while links
keep canonical handles. Native autocomplete elsewhere is unchanged.

Search being absent must skip only CLI setup, not the later native scroll
listener. Restore native hide-on-down/reveal-on-up behavior rather than styling
a permanently pinned header.

## Native live counters (#181)

The focused homepage retains the original Lichess players-online and
games-in-progress counters below quick pairing. They use the existing native
socket updates and number spreaders, with no separate counting or polling.
The removed lobby buttons and homepage feeds remain hidden.

## New opponent pool bootstrap (#196)

Retain Lichess's finished-game New opponent link to the homepage `#pool` route.
Mute's automatic Maia join previously called its immediate redraw from inside
the lobby constructor, before native `main()` initialized its Snabbdom VNodes.
That threw `Cannot access appVNode before initialization` before `/club/play`
was sent; the selected pool could remain on its spinner after the hash was
consumed. Starting from the now-playing tab could fail even earlier in `setTab`.

Queue the existing Maia hash-join callback as a microtask, so the constructor and
initial native render complete first. This adds no intentional wait or page,
retains native navigation and leaves human pool timing, manual pool clicks,
server pairing, capacity, clocks, ratings and game completion unchanged. The
regression runs the real controller, initial Snabbdom render and pool view for
signed-in, anonymous and initially-now-playing cases, then verifies the existing
request and redirect. No public games are created by these tests.

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

## Native Maia game-start sound (#206)

Successful Maia pairing now passes the same sound flag to `site.redirect` as
Lichess's native lobby socket redirect. The original Maia adapter omitted it.
Quick pairing, the native New opponent homepage flow and Custom Play all reuse
this call. Native themes, volume, autoplay checks and the existing one-second
sound timeout remain unchanged; pairing requests, clocks and ratings are intact.
The real lobby regression covers signed-in, anonymous, initially-now-playing and
custom-clock entry, verifying the existing request and the sound-enabled redirect.

## Public names in native game metadata (#210)

The native game-player label helper now renders `LightUser.publicName`, as the
other native user helpers already do. This resolves the analysis-side metadata
card showing a Nostr-derived account username after a public name is chosen.
Existing display-name fallback and Scalatags escaping apply; profile URLs still
use the canonical username. No game snapshots, IDs, ratings or histories change.

## Nostr as the public human identity (#212)

The owner subsequently chose editable, case-insensitively unique public names
(#217), superseding the earlier duplicate-name policy. The permanent public identity is the npub.
Human profiles retain their existing name/internal-ID header and add the full
public npub as subtle text: ordinary activation copies the npub, while its
permanent `/@/npub…` href retains native copy-link and modified-click behavior (#216). Native
hovercards also show a compact npub link with the full key in its accessible
label, so identity stays visible beside a chosen display name. Bots remain
native named accounts with their BOT label; they receive no Nostr keys.

The profile link validates NIP-19 checksum/type and resolves the existing stored
public key through its existing unique index, then redirects to the native
profile. No account is created by lookup. Closed accounts and unknown keys are
not exposed. Header search accepts full npub and NIP-21 `nostr:npub…` input;
ordinary display-name/canonical-account search remains unchanged. Frontend search
blocks nsec-prefixed input locally, including partial private keys, while server public lookup rejects private
keys, invalid checksums and other entity types. Native account IDs, URLs, perfs,
sessions, game histories and Nostr sign-in remain unchanged. No cooldown is introduced.

Names reserve a normalized NFKC/trim/lowercase key alongside the canonical
account ID. A unique multikey index on `user4.nameKeys` arbitrates simultaneous
claims; profile and keys update atomically in the same document. Renaming or
clearing a name releases its former chosen key and retains the canonical key.
Bot aliases and canonical names are reserved too. Account creation and native
deletion tombstones retain their canonical reservation. Conflicts return a
native profile-form error without saving the rejected profile.

For the existing population, `deploy/public/reserve-usernames.js` audits all
claims before writing and backfills only this derived field, then creates the
unique index. Run it with admissions paused and the native app stopped as part
of the existing release cutover, before the new app starts. It does not rename
users or modify keys, perfs, histories or games. The pre-release read-only audit
found no collisions across all 10,026 accounts. Preserve the index and derived
keys on subsequent releases; an old app that does not maintain these keys must
not be used for ordinary profile writes after rollback without resolving that
specific compatibility issue.

References: [NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md)
defines public-key encoding and hex storage; [NIP-21](https://github.com/nostr-protocol/nips/blob/master/21.md)
defines the public `nostr:` URI. Existing known vectors plus checksum, padding,
case/type negatives, search validation and header routing tests cover this adapter.

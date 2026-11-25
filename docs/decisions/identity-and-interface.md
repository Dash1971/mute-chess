# Owner decision record: identity and interface

Historical instructions retained from AGENTS.md (relative links adjusted). Read the [current rules](../../AGENTS.md)
first; later owner instructions supersede earlier conflicting entries.

## Required translations for user-facing text (November 4, 2026, #242)

**Locale update (November 25, 2026, #400):** The English locale identifier in
this historical instruction is superseded by the [English UI policy](../us-english-ui.md).
The English choice is `en-US`, with legacy `en-GB` preferences normalized to it.
See that policy for the pending implementation and release status.

Every added or changed user-facing string must use the existing native i18n
catalogs and be translated into all ten supported locales: en-GB, de-DE, es-ES,
fr-FR, hi-IN, ja-JP, ko-KR, pt-BR, ru-RU and zh-CN. This includes help text,
labels, titles, accessibility labels, errors and transient feedback. English
fallback alone is not completion. Preserve whole-sentence placeholders and
escaping, check catalog key/placeholder parity, and verify localized rendering
before release. Reuse existing translation tools; this requirement does not
authorize a new translation framework or general tooling.

## Nostr identity help and forum contact (November 4, 2026, #239/#240)

Keep small information buttons beside the human profile npub and permanent
account handle, using the native accessible dialog for key/privacy explanations.
Explain that the n-prefixed handle uses a shortened hex public key, while the
full npub is the permanent public identity; legacy handles remain valid. Keep
npub copying separate from the help, and never read or expose an nsec here.
Link introductory Nostr mentions to nostr.org and use Primal as a social example.
Remove Flotilla from the public UI; direct public questions and feedback to the
native forum, retaining private Nostr contact for sensitive matters. Preserve
authentication, keys, account IDs and normal forum behavior.

## Mute Chess rebrand (owner decision, 29 October 2026)

The public brand is Mute Chess, the domain is mutechess.org and the repository
is Dash1971/mute-chess. The owner authorized publishing the prepared local
rebrand on 29 October 2026; the hosted repository has been renamed. Follow the
normal issue/PR/check workflow for source publication. Domain routing and live
deployment remain separate work. Preserve persisted identity stores,
database/schema fields, internal protocol/configuration names, service accounts
and deployment paths; a branding change must not reset data. Preserve the
separate, ongoing Quiet Signal design implementation.


## Quiet Signal brand (owner decision, 29 October 2026)

The owner selected the Quiet Signal Mute Chess concept and authorized its implementation and PR. Use the interrupted knight, graphite/chalk/mint palette and moss board documented in `design/quiet-signal/README.md`. This supersedes the earlier logo-only styling restriction above. Preserve native Lichess layouts and controls. Keep internal NoSweat identifiers, existing browser identity keys, services, database paths and deployed origins intact; a domain migration requires its own deployment work. Easter egg ideas remain proposals.

## Key-first sign-in (owner request, October 29, 2026)

Lead with generating/saving a Nostr key and tell users to back up their nsec in a
password manager. Existing nsec and browser signer paths must reuse the same
identity. Retain recommended NIP-07 signing. Show authenticator/recovery-code input
only after signed proof confirms 2FA is enabled, never as an initial field or an
unauthenticated public-key probe. Preserve fresh signature-bound retries, recovery
code replay protection and local encrypted-key storage. See #59.


## Upstream credit and donation priority (owner decision, October 30, 2026)

Donate should encourage supporting Lichess first, especially for visitors who have
not donated to Lichess or can afford to support only one project. Link directly
to Lichess's patron page. Frame Mute Chess donations around its specific Maia
integration with the Lichess experience. Keep clear, linked credits on About for
Lichess/Lila, Maia, En Croissant, Mobile Maia and Stockfish, and link source and
license notices. See #67.

## Immediate forum posting (owner request, October 30, 2026)

Issue #81 removes the two-day and completed-game forum qualification for signed-in
human Mute Chess accounts. Preserve native bot denial, category permissions,
moderation, captcha, spam protections and rate limits. This supersedes the earlier
requirement to retain upstream age/game qualification; default upstream mode is
unchanged. See `docs/native-learning-community.md`.


## Friendly Nostr access and backup (owner request, October 30, 2026)

Issue #94 is authorized for implementation and a PR stacked on #83 by the owner's
subsequent chat request. Keep signer sign-in direct, guidance optional and backup
exports explicit. Preserve the existing browser key-store name/schema, identities,
NIP-07 and signed 2FA flow. No custom passphrase, local unlock or encrypted backup
format. Browser persistence is optional and must not block sign-in. See
`docs/nostr-sign-in-backup.md` for the UX, platform research and verification.


## Nostr public identity and editable unique names (November 2, #212/#217)

The owner subsequently reversed the duplicate-name decision and explicitly
authorized case-insensitively unique chosen names, remaining editable. Npub is
the permanent official public identity; chosen names are not canonical account
identifiers. Preserve atomic normalized name reservations and their unique index
while retaining all native IDs, keys and history. No silent renaming, cooldown or
account migration is authorized. Keep actual npub subtle and click-to-copy on
public human profiles (#216) and linked visibly in native hovercards, with
a shareable npub profile URL and full-key
lookup. Preserve native internal user IDs and canonical foreign-key/history
relationships; decode validated public npub input to the existing stored public
key, not a new account. Native username parsing remains unchanged. Private nsec
never belongs on a public profile or in search transport. Managed bots keep
native names and BOT labels and have no Nostr identities. No bot keys, social
publishing or account migrations are part of this work. Bot names and canonical
handles participate in the same uniqueness reservation as chosen human names.

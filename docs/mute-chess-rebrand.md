# Mute Chess rebrand

Prepared on 29 October 2026, on `codex/mute-chess-branding` in the local
`mute-chess` checkout. The rebrand was rebased onto main revision `baa8754`
after the account-security work merged in PR #35.

The public brand is **Mute Chess**, the package name is `mutechess`, the intended
repository name is `Dash1971/mute-chess`, and the domain is `mutechess.org`.
The owner authorized source publication on 29 October 2026. The hosted repository
has been renamed and the shared Git remote updated. Documentation links and
deployment domain/origin settings are prepared for those destinations; live
domain routing and deployment remain separate.

The publication initially retained the rook design and Oxanium lettering; the subsequent Quiet Signal refresh replaces them with the interrupted knight and Space Grotesk lettering. Dark/light wordmarks
now spell “Mute Chess”; native header/login alternatives and SVG titles use the
same brand. Upstream licenses and pinned third-party source identities remain
unchanged. Regenerate lettering with `fonttools==4.68.0` and
`python design/logo-explorations/build-chosen-logo.py`. The Quiet Signal generator accepts `--lila-root PATH` (also `--native-dir PATH`)
only when intentionally updating a separate native checkout.

Database names and collections, canonical account IDs, browser identity stores,
internal source/module names, asset paths, cookies, service accounts and deployed
filesystem paths remain compatible with existing state. The reserved-name list
keeps the previous system name and adds `mutechess`. New authenticator setup uses
Mute Chess as its issuer; existing authenticator secrets continue to work.

## Publication and later deployment

Source publication follows [issue #37](https://github.com/Dash1971/mute-chess/issues/37)
and the existing PR/check/merge workflow. The unfinished Quiet Signal design
implementation in the other checkout remains separate from this rebrand.
Build the entire native app/UI from the reviewed patch before a future release,
then deploy only verified main as usual.

Configure DNS, TLS/tunnel routing and the same-origin HTTP/WebSocket endpoint
for `mutechess.org` together. The gateway, Lila, websocket CSRF origin and Nostr
signed-request origin are already updated in source. Keep the existing isolated
database, service identities and directories; this change is not a data migration.

Browser-generated/imported Nostr keys are origin-scoped and do not transfer
between domains. Before redirecting the old domain, provide a way for those
users to back up/export their keys there and import them on the new domain.
NIP-07 users can sign in again using their existing signer. Native account IDs
and game histories remain in the same database; browser sessions require a new
login on the new domain.

## Local verification

- Native patch applied to the exact pinned upstream Lila revision; reverse-apply
  check confirms the final patch reproduces the inspected source.
- Adapter Node tests, browser Maia client tests, browser login bundle and runtime
  JavaScript syntax checks passed.
- Root and web TypeScript checks passed.
- Service-isolation and puzzle Python tests passed; deployment Python and SVG
  sources parse successfully.
- Dark/light outlined wordmarks rendered and visually checked.

No public smoke test or remote deployment was run. The native Scala application
was not rebuilt locally; the required native UI/build checks still run in CI
before a future release.

## Shared public preview identity (#244)

The inherited Open Graph case class defaults to `lichess.org`. The focused
Mute page renderer now overrides that identity with `mutechess.org` for every
page that supplies Open Graph metadata, including the homepage, profiles,
analysis, saved games and puzzles. It uses the existing Mute social image only
when a page has no image or uses Lichess's generic tile; position thumbnails and
other page-specific images remain intact. Root-relative position images become
absolute URLs, and the native asset helper joins the origin and asset path with
one slash. Native titles, descriptions, canonical game/profile paths and escaping
remain authoritative. Twitter cards have no independent inherited identity tag
in the pinned source; consumers can use the corrected Open Graph fields.

The fallback description and homepage preview copy use all ten supported native
catalogs. Public puzzle previews/embeds, deleted-player copy and the default feed
link also use Mute identity. The existing native `/manifest.json` endpoint points
to the already-branded Mute manifest rather than advertising Lichess's mobile
apps. Mute organization metadata contains its own name, origin, logo and GitHub
link; it does not inherit Lichess's legal registration, tax ID, contact address,
founding date or social accounts. The ordinary upstream branch remains intact.

The native source comment, About/Donate credits, licenses, third-party notices
and genuine Lichess project/resource/app references retain their attribution.
Technical names, routes, account IDs, browser storage, services and configuration
are unchanged. This is a focused branding PR; no deployment or live-data change
is included. Existing previews may remain cached by external clients after any
later deployment; fresh rendered metadata is the source of truth.

Validation uses the existing native CI with a focused `NoSweatBrandingTest`, XML
catalog checks and the exact-path departure register. The test covers generic
fallback art, meaningful game/puzzle images, escaping and unchanged upstream
identity. A real fresh link preview remains a post-deployment check once the
owner authorizes a release.


The follow-up [account and onboarding audit](account-branding-audit.md) (#258)
covers the zero-game welcome, invitations, study help and forum copy. It retains
real upstream attribution and explicitly lists blocked/native-only surfaces.

# Mute Chess rebrand — local preparation

Prepared on 29 October 2026, on `codex/mute-chess-branding` in the local
`mute-chess` checkout. This branch starts from the account-security revision
`283b855`; integrate the account-security work through its existing review first.

The public brand is **Mute Chess**, the package name is `mutechess`, the intended
repository name is `Dash1971/mute-chess`, and the owner is securing
`mutechess.org`. Documentation links and deployment domain/origin settings are
prepared for those destinations. Nothing has been pushed, renamed on GitHub or
deployed by this rebrand. The existing Git remote remains unchanged until the
hosted repository is renamed.

The current rook design and Oxanium lettering are retained. Dark/light wordmarks
now spell “Mute Chess”; native header/login alternatives and SVG titles use the
same brand. Upstream licenses and pinned third-party source identities remain
unchanged. Regenerate lettering with `fonttools==4.68.0` and
`python design/logo-explorations/build-chosen-logo.py`. Use `--lila-root PATH`
only when intentionally updating a separate native checkout.

Database names and collections, canonical account IDs, browser identity stores,
internal source/module names, asset paths, cookies, service accounts and deployed
filesystem paths remain compatible with existing state. The reserved-name list
keeps the previous system name and adds `mutechess`. New authenticator setup uses
Mute Chess as its issuer; existing authenticator secrets continue to work.

## Publication after owner approval

After the owner confirms the domain is secured and authorizes publication,
rename the hosted repository to `mute-chess`, update the Git remote, and follow
the existing issue/PR/check/merge workflow. Remove the pending-publication wording
from the README when the new site is available. Build the entire native app/UI
from the reviewed patch, then deploy only verified main as usual.

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

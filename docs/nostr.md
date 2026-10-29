# Official Mute Chess Nostr identity

- Display name: Mute Chess
- NIP-05: `mutechess@mutechess.org`
- Additional identifiers for the same identity: `club@mutechess.org`, `mutechess.org`
- Public key: `npub1w6l8e4mqa4ruqs2vdvwhdxhp9ke9ax8kpncy2wy26tja3d7rzpgq06c9jl`
- Website: https://mutechess.org
- Profile: https://primal.net/p/npub1w6l8e4mqa4ruqs2vdvwhdxhp9ke9ax8kpncy2wy26tja3d7rzpgq06c9jl

The gateway serves the public key mapping directly at `/.well-known/nostr.json`
with cross-origin access for Nostr clients. The profile uses the site's existing
rook avatar and social banner, which permit cross-origin image loads.

The owner-provided Wallet of Satoshi Lightning address is configured in the
published profile's `lud16` field: `dash@walletofsatoshi.com`. NIP-05 is an identity address, separate from
that payment address.

Private signing keys and recovery material belong only in the owner's key
storage. They are absent from source control, public releases and the server.
The website does not need a signing key to serve domain verification.

Run `node deploy/public/test-nostr.mjs` to check domain verification, supported
methods, CORS, social image headers and the existing gateway route boundary.

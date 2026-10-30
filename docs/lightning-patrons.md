# Lightning patron support

The owner confirmed `dash@walletofsatoshi.com` and the official Mute Chess account `npub1w6l8e4mqa4ruqs2vdvwhdxhp9ke9ax8kpncy2wy26tja3d7rzpgq06c9jl`. These replace the earlier on-chain/mempool settlement proposal and Mobile Maia address lookup. No Mobile Maia or Zapstore configuration is changed.

The header Donate link opens a native-styled support page. Anonymous visitors can scan the direct LNURL or open their wallet. Signed-in Nostr users choose sats or USD (a current browser-side mempool.space quote), sign a NIP-57 profile zap request using NIP-07 or their saved browser key, then scan the returned Lightning invoice. Creating/signing an invoice never pays it. The page also links to the official Nostr profile for direct zaps. The lower Lichess Patron promotion is removed.

Any confirmed donation through this page grants native patron wings until 30 days after payment. It is a one-time donation, not a subscription. Direct external zaps support the project, but automatic wings require a recorded website invoice. The amount remains pay-what-you-want, at least one whole satoshi within the provider limits.

The adapter fetches only the fixed owner LNURL endpoint and HTTPS callbacks on Wallet of Satoshi / Living Room of Satoshi. Redirects, unexpected issuer keys, mismatched amount/description hashes and malformed or invalidly signed BOLT-11 invoices fail closed. The native application binds each invoice to the signed-in Nostr identity and retains its payment hash, invoice and signed request ID in `nosweat_donation`.

The browser listens on the same three public receipt relays advertised by NIP-05. It submits a NIP-57 receipt to the server, which independently validates the pinned wallet signature, recipient, original signed request, exact amount, invoice description hash, timestamps and optional preimage. The native ledger must match the exact invoice and donor before the native Plan API grants wings. A wallet-wide signing key alone is insufficient: a receipt for an invoice fetched from another wallet must not qualify. Neither invoice generation nor a client-side success flag grants wings.

Paid-at-based expiry and Mongo `$max` make duplicate receipts and interrupted retries idempotent. Native patron expiration, account marks and light-user cache invalidation are retained. No private wallet key, Mute Chess signing key, wallet connection or automatic payment permission is needed by the website.

The adapter alone receives limited outbound TLS to public IPs resolved for the two fixed provider hosts during installation, plus local stub DNS. All other service egress boundaries remain unchanged. Systemd IP restrictions and the nftables UID/port rules both enforce this allowlist. Provider DNS changes fail closed until the reviewed installer refreshes the addresses during maintenance. Certificate verification and redirect rejection remain enabled.

Qualification includes a real unpaid 100-sat zap invoice, an independent unpaid provider invoice signature fixture, cryptographic negative cases and provider callback/redirect boundary tests. Disposable signed receipt fixtures cover the verifier without spending funds. A real settled donation is still needed to exercise the complete provider-receipt delivery path; no test payment or real patron grant is claimed.

On October 30, 2026 the owner changed the receiving address to
`dash@walletofsatoshi.com` (#64). Fresh LNURL metadata confirms that address
supports NIP-57 and retains the pinned Wallet of Satoshi receipt-signing public
key. The donation link, QR/LNURL and new invoice requests use this destination.
The official Nostr public identity remains unchanged; its external profile should
use this address as `lud16`. No Nostr event or Mobile Maia/Zapstore update is
published by the website deployment.

Receipt verification retains the retired LNURL solely for previously issued
invoices. New requests reject it; wings still require the exact invoice, donor
and request ID already recorded in the native ledger.

## Donation priority and credits (owner decision, October 30, 2026)

The top of Donate asks visitors to support Lichess first, with a direct link to
https://lichess.org/patron. If someone has not yet supported Lichess, or can afford
to donate to only one project, we prioritize Lichess. Mute Chess donations are
framed as support for its specific Maia integration with the Lichess experience.
About → Credits links and describes the contributions of Lichess/Lila, Maia3 and
the Maia platform, En Croissant, Mobile Maia and Stockfish, with links to the
third-party notices and complete corresponding-source archive. Payment and
patron-wing behavior is unchanged.

## Wallet invoice description compatibility (#108)

Wallet of Satoshi can return either BOLT-11's inline UTF-8 `d` description or
its SHA-256 `h` description hash. Short browser-signed zap requests can fit
inline, while longer diagnostic requests may use a hash. Rejecting all inline
invoices made the real browser flow fail even when longer test requests passed.

Both forms must authenticate the exact serialized signed zap request: inline
text must match byte-for-byte, or the hash must equal SHA-256 of that text.
The invoice signature, exact amount, trusted recipient/provider, receipt
signature and native ledger/account binding remain mandatory. An ordinary
inline wallet memo or a different signed request does not qualify. Creation and
receipt verification use the same binding rule; no payment or patron status is
inferred from invoice generation.

Invoice failures distinguish invalid/expired signed requests, provider network
or HTTP failures, unreadable responses, and unverified invoices. Public messages
suggest a safe retry; adapter logs retain only a bounded error code, without
signed requests, donor IDs, invoices, tokens or provider payloads.

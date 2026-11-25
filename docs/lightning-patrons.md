# Lightning patron support

The donation recipient is `dash@walletofsatoshi.com`, with official Mute Chess
identity `npub1w6l8e4mqa4ruqs2vdvwhdxhp9ke9ax8kpncy2wy26tja3d7rzpgq06c9jl`.

The header Donate link opens a native-styled support page. Anonymous visitors can scan the direct LNURL or open their wallet. Signed-in Nostr users choose sats or USD (a current browser-side mempool.space quote), sign a NIP-57 profile zap request using NIP-07 or their saved browser key, then scan the returned Lightning invoice. Creating/signing an invoice never pays it. The donation UI uses its invoice/QR and Open wallet actions; direct Nostr-zap and wallet-address links are omitted to keep the flow clear. The lower Lichess Patron promotion is removed.

Any confirmed donation through this page grants native patron wings until 30 days after payment. It is a one-time donation, not a subscription. Direct external zaps support the project, but automatic wings require a recorded website invoice. The amount remains pay-what-you-want, at least one whole satoshi within the provider limits.

The adapter fetches only the fixed owner LNURL endpoint and HTTPS callbacks on Wallet of Satoshi / Living Room of Satoshi. Redirects, unexpected issuer keys, mismatched amount/description hashes and malformed or invalidly signed BOLT-11 invoices fail closed. The native application binds each invoice to the signed-in Nostr identity and retains its payment hash, invoice and signed request ID in `nosweat_donation`.

The browser listens on the same three public receipt relays advertised by NIP-05. It submits a NIP-57 receipt to the server, which independently validates the pinned wallet signature, recipient, original signed request, exact amount, invoice description hash, timestamps and optional preimage. The native ledger must match the exact invoice and donor before the native Plan API grants wings. A wallet-wide signing key alone is insufficient: a receipt for an invoice fetched from another wallet must not qualify. Neither invoice generation nor a client-side success flag grants wings.

Paid-at-based expiry and Mongo `$max` make duplicate receipts and interrupted retries idempotent. Native patron expiration, account marks and light-user cache invalidation are retained. No private wallet key, Mute Chess signing key, wallet connection or automatic payment permission is needed by the website.

The adapter alone receives limited outbound TLS to public IPs resolved for the two fixed provider hosts during installation, plus local stub DNS. All other service egress boundaries remain unchanged. Systemd IP restrictions and the nftables UID/port rules both enforce this allowlist. Provider DNS changes fail closed until the reviewed installer refreshes the addresses during maintenance. Certificate verification and redirect rejection remain enabled.

New donation requests use `dash@walletofsatoshi.com`. Previously issued invoices
retain their original receipt binding; a new request cannot use the retired
recipient. The website does not publish Nostr profile edits or alter Mobile Maia
or Zapstore configuration.

Receipt verification retains the retired LNURL solely for previously issued
invoices. New requests reject it; wings still require the exact invoice, donor
and request ID already recorded in the native ledger.

## Donation priority and credits

The top of Donate asks visitors to support Lichess first, with a direct link to
https://lichess.org/patron. If someone has not yet supported Lichess, or can afford
to donate to only one project, we prioritize Lichess. Mute Chess donations are
framed as support for its specific Maia integration with the Lichess experience.
About → Credits links and describes the contributions of Lichess/Lila, Maia3 and
the Maia platform, En Croissant, Mobile Maia and Stockfish, with links to the
third-party notices and complete corresponding-source archive. Payment and
patron-wing behavior is unchanged.

## Wallet invoice descriptions

Wallet of Satoshi can return either BOLT-11's inline UTF-8 `d` description or
its SHA-256 `h` description hash. Short browser-signed zap requests can fit
inline, while longer diagnostic requests may use a hash. Both representations are supported.

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


## Payment completion and patron presentation

The pending response remains an array of all active unpaid invoices. Its
additive authenticated `X-Mute-Patron-Paid-At` header identifies the latest
confirmed donation time, derived from the existing receipt-backed `patronUntil`
minus 30 days. The client keeps every returned invoice eligible for a late
receipt but restores a payment prompt only for an invoice created afterwards.
This prevents an older unpaid request from reappearing after a successful
payment, while preserving a genuinely newer renewal request. No ledger record
is deleted or marked paid by this presentation rule.

Only a server-confirmed receipt hides the QR/actions and shows the translated
paid status, wing and checkmark. A brief pop/glow respects reduced motion, then
the existing native page refresh updates account furniture. Settled guards stop
an in-flight QR render or stale subscription from restoring waiting/expiry
state. Unconfirmed responses never trigger the animation or patron state.

The single Create invoice action uses an available browser signer, otherwise
reads the saved browser key only on that click. It retains account matching and
zeroes the transient key after use. The duplicate saved-key button and technical
helper paragraph are removed. Missing signing access uses a short translated
sign-in-again message. Paid/waiting/thanks/recovery text ships in all ten native
locales. Payment signing, invoices, recipient, validation and wings duration
are unchanged.

Nostr profile headers put trophies in normal flex flow beside the public name.
The identity block shows the npub first and the permanent @ID directly below it,
sharing a left edge, with each information button beside its text. Clicking the
ID copies the full permanent profile URL with the same 900ms feedback as the npub.
Both help dialogs are retained. The donation UI omits the direct wallet/Nostr links
and the address suffix under an invoice; the fixed amount remains visible.
Native trophy content, packing and non-Nostr layout remain intact.


## Dismissing an outstanding invoice

Signed-in donors can choose **Dismiss invoice** to hide an unpaid donation
request, including after reloading. The adjacent help and result explain that
the wallet invoice can still be paid until its expiry. Our current public
LNURL-pay/NIP-57 integration provides invoice creation and receipt verification,
not wallet invoice revocation; no wallet-management API or secret is added.
The [LNURL-pay flow](https://github.com/lnurl/luds/blob/luds/06.md) and
[NIP-57 flow](https://github.com/nostr-protocol/nips/blob/master/57.md) document
those public creation and receipt operations. This does not claim that every
provider's separate management API lacks cancellation.

The existing authenticated same-origin controller atomically matches the exact
payment hash, signed-in account and `paid: false` before setting only a
`dismissed` flag. A paid record or another account's invoice cannot be dismissed.
Repeated dismissal is harmless. No invoice, receipt or paid record is deleted,
and dismissal never grants wings or changes payment state. A payment racing
dismissal still goes through the original verified receipt/account/ledger checks
and grants the same native wings.

The pending body remains the existing unpaid-invoice array. Its additive
authenticated `X-Mute-Patron-Dismissed` header carries the dismissed hashes from
that same bounded result, with `Cache-Control: no-store`. The browser tracks
all returned invoices for late receipts and restores only non-dismissed invoices
newer than the existing paid-at watermark. New renewal invoices remain available.
Dismissal and display guards prevent stale QR/expiry/pending/copy callbacks from
restoring the hidden request; a server-confirmed payment wins over an in-flight
dismissal. The full QR payload, invoice amount, signer validation and receiving
address are unchanged.

Action, help, success and failure feedback use the native catalogs in all ten
supported locales. Verification uses mocked invoice fixtures and cryptographic
receipt tests; fixture results are separate from real payment/device acceptance.

[Implementation and QR investigation history](records/docs398-lightning-patrons-history.md)
is retained separately. The [follow-up evidence](records/documentation-follow-up-2026-11-25.md)
confirms the QR rendering code is already shipped; it is not a new wallet/device
compatibility or payment test.

<details>
<summary>Historical section links</summary>

<a id="donation-priority-and-credits-owner-decision-october-30-2026"></a>
- [Donation priority and credits (owner decision, October 30, 2026)](records/docs398-lightning-patrons-history.md#donation-priority-and-credits-owner-decision-october-30-2026)

<a id="wallet-invoice-description-compatibility-108"></a>
- [Wallet invoice description compatibility (#108)](records/docs398-lightning-patrons-history.md#wallet-invoice-description-compatibility-108)

<a id="payment-completion-and-patron-presentation-252"></a>
- [Payment completion and patron presentation (#252)](records/docs398-lightning-patrons-history.md#payment-completion-and-patron-presentation-252)

<a id="qr-scanning-and-display-resolution-247"></a>
- [QR scanning and display resolution (#247)](records/docs398-lightning-patrons-history.md#qr-scanning-and-display-resolution-247)

<a id="dismissing-an-outstanding-invoice-260"></a>
- [Dismissing an outstanding invoice (#260)](records/docs398-lightning-patrons-history.md#dismissing-an-outstanding-invoice-260)

</details>

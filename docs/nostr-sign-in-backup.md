# Nostr sign-in and key backup

Use the same Nostr identity across generated/saved keys, imports and browser
signers. Private keys stay in the browser or signer; back up the original key
explicitly if you want to retain access.

## Consistent signup identity

Every new human Nostr account uses `n` followed by the first 19 hexadecimal
characters of its verified public key as its native ID, whether or not a name
is supplied at signup. A supplied name is saved as the editable profile
`displayName`; both canonical and chosen-name uniqueness claims commit in the
same user insert. Login still resolves the full public key first, so an existing
account keeps its identity and does not get recreated when a name is supplied.
Bots retain their native named identities. The full npub remains the public
identity and collision checks remain authoritative for shortened native IDs.

Existing accounts retain their IDs and stored history; signup does not migrate
old identities or introduce previous-ID redirects.

## Reserved account-ID names

New chosen names cannot use the permanent account-ID format: `n` followed by
19 hexadecimal characters. Signup and profile editing check the normalized name
(NFKC, trimmed and case-folded), so equivalent spellings are reserved too. An
unchanged historical name remains valid for unrelated profile edits. The native
unique name-claim index still decides concurrent conflicts; no IDs, keys, ratings
or history are migrated. Any future name-rule change must check historical
conflicts before changing existing accounts.

## Sign-in limits and challenge lifetime

The native app permits 30 challenge requests and 30 sign-in submissions per
client network per minute. Only creation of a new identity uses the native signup
allowance of 10 accounts per ten minutes and 150 per day; returning players do
not consume it. IPv6 addresses in the same /64 share a network allowance.
The gateway separately allows 90 authentication POSTs per network per minute,
with browsing/action and asset allowances remaining separate. When its exact
network table fills, bounded keyed overflow counters still admit new networks;
colliding overflow networks share a counter for that minute.

Challenges last 60 seconds and remain bound to the public key and requested
action. The signed event also covers the URL, HTTP method and exact body.
Unfinished requests consume no replay-storage slots and do not cancel earlier
requests. Only successfully verified proofs occupy replay storage: at most
256 buckets of 256 proofs. If one bucket fills with unexpired successful proofs,
its key rotates before entries are forgotten, invalidating that bucket's older
outstanding challenges; those callers can retry with a fresh challenge. Other
buckets continue. An adapter restart invalidates outstanding challenges, while
existing native sign-in sessions remain unchanged. Native per-account two-factor
attempt limits, atomic code consumption and session revocation remain in force.

Sign-in, key backup, browser-storage feedback and two-factor setup/recovery use
all ten supported native languages, including accessibility labels and errors.
Account-unavailable feedback is returned only after a verified signed request.
Enrollment and recovery controls stay hidden until their corresponding step.

## Experience

Profile information buttons beside the npub and permanent account handle open
the existing native dialog (#239). They explain the public npub/private nsec pair,
username changes, permanent profile links, using the identity on other Nostr apps,
and minimizing personal information. Introductory links use nostr.org, with Primal
as a social example. The handle explanation calls the `n` plus 19-character hex
prefix a shortened account ID, not the full public key; legacy non-derived handles
use the generic permanent-ID explanation. All human Nostr profiles show their
permanent handle, including those without a chosen username. Managed bots have
no Nostr help buttons. The help reads no key storage and exposes no private keys.
The npub's existing click-to-copy and 900ms Copied feedback remain separate.
The permanent @ID sits immediately below the npub in the same left-aligned grid;
each information button stays next to its identity text, leaving the heading for
the name and trophies. Clicking the ID copies its full permanent profile URL,
with the same 900ms Copied feedback as the npub. Modified clicks retain normal
link navigation.
Profile help, the introductory login disclosure, contact guidance and copy
feedback use native translations in all ten supported locales (#242), including
titles and accessible labels. Linked sentences retain translated placeholders.

Keep Create a key and play, Continue with saved key, and Log in with signer as
direct actions. No required tutorial or backup acknowledgment. A closed “New to
Nostr?” disclosure explains the public npub, private nsec, signer and using the
same identity elsewhere. The nos2x installation link is beside signer sign-in;
other NIP-07 signers keep working. nos2x is labeled Chrome / Chromium, without
suggesting Safari or Firefox compatibility for that extension.

Creating a key opens the existing backup card once, at the point it is useful.
Copy key, Download .txt and Show/Hide key are explicit actions; continuing is
possible without any of them. Returning users can open Back up your saved key
and copy/download the original browser key without creating a replacement or
signing in. There are no visit-based reminders or automatic private-key exports.
An imported key is already user-supplied; sign-in proceeds directly with it.

Keeping access to your key is a separate optional disclosure. It covers site-data
clearing, private browsing, another browser/profile and another device. Restoring
requires the original key or access to its signer; a new key is a new identity.
The optional Ask browser to keep site data action reports granted, declined or
unavailable accurately. It never runs at startup or blocks an authentication
request while the browser answers. Retrying is an explicit action.

## What is stored

Existing keys remain in IndexedDB database `nosweatchess-identity-v1`, object store
`identity`, record `current`. An AES-GCM ciphertext, random IV and non-extractable
WebCrypto wrapping key remain unchanged. This is the existing local storage
mechanism, with no passphrase or unlock step. Same-origin JavaScript can use the
store; it is not an independent backup or a substitute for an external signer.
No identity migration or schema change is introduced.

Browser storage normally survives a reload or restart in the same origin and
profile. Retention depends on browser policy; clearing site data removes the
wrapping key too. Nothing here guarantees indefinite storage or synchronizes
IndexedDB across devices. History is not the key store. Persistent storage is
requested only on the user's optional button click and does not replace backup.
[MDN storage retention](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
and [persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
describe browser permission, eviction and private-browsing limits.

## Backup choices

| Option | What it keeps | Recovery and effort |
| --- | --- | --- |
| Existing NIP-07 signer | The signer manages the private key | Fast sign-in; use the same signer identity on another device according to its own backup/sync options. |
| Browser key | Existing wrapped key in this origin/profile's IndexedDB | Convenient return visits; clearing or losing that store still needs an external copy. |
| Copy to a password manager | User pastes the nsec into a password entry or secure note | Portable according to the chosen manager; restore by pasting the same nsec. |
| Apple Passwords / iCloud Keychain | User manually saves the nsec in an entry's password field | Keychain can sync the entry when enabled; the user copies the stored key to restore it. No automatic site integration is promised. |
| Download .txt | A plain-text nsec followed by a newline | Simple file backup; user chooses where to keep it and can paste the key to restore. |

Apple supports manually adding a password and syncing saved entries with iCloud
Keychain: [manual entry](https://support.apple.com/en-us/guide/iphone/iph4ebb320ea/ios),
[Keychain setup](https://support.apple.com/en-us/109016). Save the original nsec,
not a newly suggested password. The page does not call an Apple-specific API or
claim that copying a key automatically puts it in Keychain.

A programmatic `PasswordCredential` would store an npub/identifier and the nsec as
a password. Its support is limited, with Safari and Firefox unsupported in the
[MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/PasswordCredential.json).
The [Credential Management API](https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/store)
therefore does not provide a dependable cross-browser/iCloud save action here.
The site uses portable copy/manual-save controls; do not replace
Nostr sign-in with a passkey or invent another password or recovery system.

## Boundaries and verification

The browser handles local backup and storage actions; native sessions, server proof
verification, challenge-bound retries, 2FA and signer ownership remain intact.
Private keys are never added to request bodies, URLs, filenames, logs or analytics.
Downloads use a temporary blob URL, removed link and revoked URL, and contain only
the nsec plus a newline. Saved-key copies are cleared from temporary byte arrays.
Export does not overwrite storage, authenticate or change the selected identity.

Run the adapter tests, browser bundle build, native source/departure
checks and native view formatting/compilation. Browser regressions cover exact
exports, no automatic export, clipboard failure, persistence refusal/unavailability,
independence from sign-in, saved-key reuse and unchanged signed 2FA retries. Check
closed/open disclosures and the key actions at desktop and narrow browser widths.

## Private account Nostr section

`/club/nostr` requires the authenticated owner and sends Cache-Control: no-store.
Account settings and the owner's profile action menu link to it. Public-profile
npub copying remains separate from the private-key controls. The page receives
only the public key.
Public npub copy never decrypts a private key. Reveal requires acknowledging the
private-key warning and an explicit click; the browser reads the existing store,
checks its derived public key against the current account, and wipes the byte
buffer. Nsec is never sent to the server or a relay. A mismatched or absent key
is not revealed; an external signer keeps custody of its own private key.

Shown nsec text clears after one minute, on tab hiding/page navigation, or on
manual hide/acknowledgment changes. Copy is explicit and explains clipboard
exposure. No new key storage, encryption, password or identity migration occurs.

A separate Chess on Nostr introduction links to Primal and the existing official
Mute Chess npub from docs/nostr.md. Following/signing is the user's action in the
client. Explain signer sign-in and #chess discovery; pass no private key or
current-user identifier in outbound links. Primal is a recommended web option,
not a measured popularity ranking. See the [Nostr identity guide](nostr.md).

[Implementation history](records/docs398-nostr-sign-in-backup-history.md) retains dated decisions and validation.

<details>
<summary>Historical section links</summary>

<a id="nostr-sign-in-and-key-backup-94"></a>
- [Nostr sign-in and key backup (#94)](records/docs398-nostr-sign-in-backup-history.md#nostr-sign-in-and-key-backup-94)

<a id="consistent-signup-identity-256"></a>
- [Consistent signup identity (#256)](records/docs398-nostr-sign-in-backup-history.md#consistent-signup-identity-256)

<a id="reserved-account-id-names-348"></a>
- [Reserved account-ID names (#348)](records/docs398-nostr-sign-in-backup-history.md#reserved-account-id-names-348)

<a id="sign-in-limits-and-challenge-lifetime-349354"></a>
- [Sign-in limits and challenge lifetime (#349/#354)](records/docs398-nostr-sign-in-backup-history.md#sign-in-limits-and-challenge-lifetime-349354)

<a id="backup-choices-and-platform-investigation"></a>
- [Backup choices and platform investigation](records/docs398-nostr-sign-in-backup-history.md#backup-choices-and-platform-investigation)

<a id="verified-nos2x-destination"></a>
- [Verified nos2x destination](records/docs398-nostr-sign-in-backup-history.md#verified-nos2x-destination)

<a id="private-account-nostr-section-125"></a>
- [Private account Nostr section (#125)](records/docs398-nostr-sign-in-backup-history.md#private-account-nostr-section-125)

</details>

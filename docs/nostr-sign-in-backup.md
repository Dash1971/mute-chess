# Nostr sign-in and key backup (#94)

The owner authorized implementation and a PR stacked on forum PR #83 on October
30, 2026, superseding the issue's original idea-only hold.

## Experience

Keep Create a key and play, Continue with saved key, and Log in with signer as
direct actions. No required tutorial or backup acknowledgement. A closed “New to
Nostr?” disclosure explains the public npub, private nsec, signer and using the
same identity elsewhere. The nos2x installation link is beside signer sign-in;
other NIP-07 signers keep working. nos2x is labelled Chrome / Chromium, without
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

## Backup choices and platform investigation

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
Keep the portable copy/manual-save approach for this release; do not replace
Nostr sign-in with a passkey or invent another password or recovery system.

## Verified nos2x destination

Checked October 30, 2026: the [maintainer's README](https://github.com/fiatjaf/nos2x)
links the Chrome extension ID `kpgefcfmnafjgpblomihpgmejjdanjjp`. Its old store URL
redirects to the [current Chrome Web Store listing](https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp),
which is the URL used in the view. External links use `noopener noreferrer`.

## Boundaries and verification

Only the existing namespaced login view and its CSS change in the native patch.
The adapter handles backup and storage requests; native sessions, server proof
verification, challenge-bound retries, 2FA and signer ownership remain intact.
Private keys are never added to request bodies, URLs, filenames, logs or analytics.
Downloads use a temporary blob URL, removed link and revoked URL, and contain only
the nsec plus a newline. Saved-key copies are cleared from temporary byte arrays.
Export does not overwrite storage, authenticate or change the selected identity.

Run the adapter tests, browser bundle build, upstream register/patch reconstruction
checks and native view formatting/compilation. Browser regressions cover exact
exports, no automatic export, clipboard failure, persistence refusal/unavailability,
independence from sign-in, saved-key reuse and unchanged signed 2FA retries. Check
closed/open disclosures and the key actions at desktop and narrow browser widths.

## Private account Nostr section (#125)

`/club/nostr` requires the authenticated owner and sends Cache-Control: no-store.
Account settings and the owner's profile action menu link to it. Remove the
inline npub field from public profiles. The page receives only the public key.
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
not a measured popularity ranking. References checked October 31, 2026:
https://github.com/PrimalHQ/primal-web-app and https://nostr.how/en/clients.

# Cloudflared, SQLite and advisory review — November 25, 2026

Owner-authorized scope: issue #392. Cloudflared was upgraded from 2026.11.1
to 2026.11.2, and libsqlite3-0 from 3.46.1-9ubuntu0.3 to 3.46.1-9ubuntu0.4.
The tunnel and fwupd restarted; application process IDs were unchanged. No reboot
was required. SQLite includes the vendor WAL-reset corruption-race fix (LP2171337).
Cloudflared contains x/crypto 0.59.0 and x/net 0.62.0; installed and running
executable SHA256 is 56f13335143ec0e22772963290683a84a04114a35ec64cbc794a4d39ff9bb8cf.

The active application remains bc226308e6b7c77801dc3d120b5b34872a8fa0c9,
native a372615f8a1fe3f6d48ba60913c44d7b6b40da48, tree
8ca5466297355f02cd67ec71726bb8abcc498839. No application rebuild is claimed.
Preserve SECURITY381_BUILD.json and original source archives byte-for-byte.
Refresh both current verification readers using observed runtime checks and the
reviewed inventory; completion requires a fresh existing-classifier result.

Forum timestamp GHSA-x2f3-xq9c-mcfq and magic-email-token
GHSA-gx5m-2j8r-9jwf are already fixed in this pin. The inventory records their
actual upstream fix ancestry and deployed source/class evidence instead of
relying on stale advisory patched-version metadata. No account tokens or forum
contents were recovered or modified.

Issue #393 tracks two draft-only backports for the next application release:
lobby hook_like ID validation (GHSA-3m7f-j2c6-6x4x), and checking Racer room
existence in lila-ws (GHSA-2rpf-mmrc-v68p). Mute uses a fixed /club/play JSON
endpoint for the former; the public gateway denies Racer WebSocket upgrades
for the latter. Keep both findings visible until actual patched deployment;
this runtime maintenance neither ships nor clears those backports.

Source: [Cloudflared dependency fixes](https://github.com/cloudflare/cloudflared/commit/40553f3b6d8e0adc62c5a3c9f4f2ca41978259cc).
No classifier predicates, monitoring controls, schedules, credentials or
application release fingerprints change.

## Correction note — November 26, 2026

PR #395 amended the restart sentence above from “Only the tunnel restarted” to
include the fwupd restart. This note makes that later correction explicit;
the recorded application process IDs were unchanged.

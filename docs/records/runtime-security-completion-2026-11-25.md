# Runtime security maintenance completion — November 25, 2026

Completion addendum to the unchanged
[original runtime-security record](runtime-security-2026-11-25.md), using the
published [PR #394 maintenance receipt](https://github.com/Dash1971/mute-chess/pull/394).
This addendum records that receipt; it does not rerun its checks or refresh the
host's inventory/reference records.

The receipt reports Cloudflared 2026.11.2 and SQLite 3.46.1-9ubuntu0.4 installed,
matching installed/running Cloudflared fingerprints, healthy services, HTTP and
WebSocket access, signed rejection/replay and Study access checks, advancing real
games, and 28 matching deployed class fingerprints. Application process IDs and
RELEASE.json were unchanged; no application rebuild or reboot was performed.

Both current security readers and the corresponding-source archive were refreshed
while preserving the original SECURITY381 build receipt. The fresh existing
classifier result was `inventory_verified=true`, with 27 reviewed findings,
two pending upstream advisories, zero dependency alerts, zero pending OS updates
and no scan errors. Monitor control hashes/isolation matched and containment
was clear. No classifier predicates, monitoring controls or schedules changed.

The pending lobby-ID and Racer advisories remained visible under #393. This is a
dated maintenance result, not a promise that later collections have identical
counts or permission to mark the queued application backports deployed.

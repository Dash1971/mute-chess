# Post-release documentation review — November 26, 2026

Review for [#408](https://github.com/Dash1971/mute-chess/issues/408), against main
`d64100abcbd937391aca8093790dea1f428cd763`. The
[November 26 release record](release-2026-11-26.md) supplies the verified
application identities and live acceptance results. This documentation review
does not repeat host checks or perform a release build, deployment or service
change. Standard CI source validation is separate from release activation.

Living guides now describe deployed US English, link the current security
evidence, retain the open deepmerge finding, and describe the complete WebSocket
patch and supported product features. The renderer guide distinguishes its
Ubuntu 24.04 CI builder from the maintained Ubuntu 26.04.1 host and requires
target-library checks. Earlier validation and reproduction instructions are
retained in the real-time guide's history; dated maintenance records receive
completion/correction addenda rather than rewritten results.

The manual release wording search was reviewed. Remaining matches describe
standing procedures, genuine pending work, import/invoice states, historical
instructions, dated reports or preserved section URLs. No living guide still
calls the verified US English or lobby/Racer/SRI deployment upcoming.

## Deferred inventory wording

Issue #408 item 13 belongs to the next planned inventory update. Keep the
following files byte-for-byte unchanged in this documentation-only review:

- `docs/security-inventory.json`: replace the old active `bc226308` context in
  the fast-xml-parser entry and fix run-together wording during that update.
- `deploy/lila/upstream-departures.json`: update the former draft/deployment
  caveats in the Racer and SRI verification entries against the real release
  evidence during that update.

These are wording follow-ups, not a claim that the three guards remain
undeployed. The [verified release](release-2026-11-26.md) records their
activation. Its inventory SHA256 remains
`f02954fd0f2d72905cef3e54b13c7bc2e7e602c832cfb5b1dfabe842f7e12ec2`.
The next authorized inventory change must follow the existing matching-hash and
current-release verification procedure; this review grants no release authority.

## Documentation checks

The records index covers all 40 dated records. A repository-wide check of 145
Markdown files found 1,677 relative links and 160 Markdown fragments with no
missing paths or anchors. The diff contains Markdown only; inventory, departure
register and native pin hashes match the base, and all four amended dated records
retain their exact original bodies before their new addenda. Normal PR checks
are reported on the pull request; no live acceptance checks were rerun here.

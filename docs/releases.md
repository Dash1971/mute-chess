# Verified release history

This page links confirmed deployment records, not every merge. `main` can be
ahead of the site. To identify the serving release, check the site's
`X-NoSweat-Revision` header; the authorized operator also checks active
`RELEASE.json`, its native commit/tree and matching verification.

| Observed deployment | Mute main | Native fork | Upstream base | Headline and evidence |
| --- | --- | --- | --- | --- |
| November 26, 2026 | `729fd722695e334b786715b1bbebbfaf712babe0` | `f042367d18dac287dbfde5f9d20a0be088b3a11a` | `b071608bc4ce71b31cda36ffa493100e3dc3580f` | US English and lobby/Racer/SRI guards; [verified deployment record](records/release-2026-11-26.md) |
| November 23, 2026; still active when read November 24 | `bc226308e6b7c77801dc3d120b5b34872a8fa0c9` | `a372615f8a1fe3f6d48ba60913c44d7b6b40da48` | `b071608bc4ce71b31cda36ffa493100e3dc3580f` | Chat-timeout and structured-data fixes; [deployment receipt](https://github.com/Dash1971/mute-chess/pull/382), [read-only evidence](records/documentation-review-evidence-2026-11-24.md) |

This is the start of the indexed history, not a claim that older releases never
existed. Historical receipts remain in their original records and the verified
archive; dates and source identities must not be reconstructed from merge times.
Add an entry only after an actual deployment and link its evidence. Documentation
PRs do not get application-release entries. No new release automation or GitHub
release-publication process is introduced.

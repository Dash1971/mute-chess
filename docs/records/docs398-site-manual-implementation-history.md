# Account presentation implementation notes

Historical text preserved November 25, 2026 from `c6b0bfc`; current
user-facing behavior is in the [site manual](../site-manual.md).

## Public names in statistics (#266)

Focused time-control statistics use the account’s existing public-name lookup in the browser title, linked heading, percentile description and comparison-chart label. This covers every speed through the shared native view. Empty names and managed bot aliases follow the existing account policy; Scalatags and JSON escaping remain native.

Canonical profile URLs, game-list filters, comparison URLs, game IDs, ratings and stored history remain unchanged. The upstream branch retains its original username labels. No new interface text or translation keys are introduced; existing translated statistics labels are retained.


## Public names in chat (#273)

The native chat writer adds the existing optional LightUser display name for both loaded history and new live lines. The shared native user-link helper renders that label as escaped text, with native fallback for missing/empty metadata. The label participates in Snabbdom thunk arguments, so a new name refreshes the displayed author without changing its identity or link. BOT titles, patron styling and flair are preserved.

The canonical `u` field, stored UserLine serialization, profile hrefs, ownership/mention checks, moderation and blocking remain unchanged. Names are resolved for presentation rather than written into historical chat records; this makes renamed users readable under their current name. Older clients ignore the optional field and retain their canonical labels. Anonymous player-color/system lines are untouched.

No interface strings are introduced. Two actual-renderer DOM regressions verify label updates, canonical links, injection-safe text, old/empty fallback and BOT labels. The native JSON/storage regression is added to the existing CI test invocation.


## Key-copy feedback (#268)

Generated-key and saved-key Copy buttons briefly show the existing translated Copied label after the clipboard write resolves, then restore their label after 900 ms. A second successful copy restarts that interval. The button reserves its measured width during feedback, so surrounding controls do not move. Its polite live announcement contains only the label, never the key.

Clipboard rejection uses a translated error pointing to Download and never reports success. Page exit and a new generated identity clear feedback; an old pending copy cannot restore it after exit. Masking, exact copied key bytes, downloads, saved-key erasure and sign-in remain unchanged. The existing translation catalogs provide all ten locales.

The login page advances its browser-script version so existing visitors receive the matching copy-feedback code.

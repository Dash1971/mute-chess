# Public names in chat (#273)

The native chat writer adds the existing optional LightUser display name for both loaded history and new live lines. The shared native user-link helper renders that label as escaped text, with native fallback for missing/empty metadata. The label participates in Snabbdom thunk arguments, so a new name refreshes the displayed author without changing its identity or link. BOT titles, patron styling and flair are preserved.

The canonical `u` field, stored UserLine serialization, profile hrefs, ownership/mention checks, moderation and blocking remain unchanged. Names are resolved for presentation rather than written into historical chat records; this makes renamed users readable under their current name. Older clients ignore the optional field and retain their canonical labels. Anonymous player-color/system lines are untouched.

No interface strings are introduced. Two actual-renderer DOM regressions verify label updates, canonical links, injection-safe text, old/empty fallback and BOT labels. The native JSON/storage regression is added to the existing CI test invocation. No merge or deployment is part of this PR preparation.

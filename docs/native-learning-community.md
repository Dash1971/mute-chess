# Native explorer, community, learning and settings

Owner requests, 29 October 2026, tracked in #43–46 (opening explorer #42 is deferred). Reuse the native Lichess UI,
models and controllers, with standard chess only; no replacement chess application.

- Opening explorer is deferred by the owner. Live verification found that the
  official opening database requires Lichess authentication. No secondary login,
  token, API connection, opening-data copy or partial connection flow is shipped.
  Its unavailable navigation/control is hidden pending a future decision (#42).
- Forum uses native categories, posting forms, captcha, age/game qualification,
  rate limits, moderation and notifications. New accounts retain upstream posting
  eligibility. No fake content or moderator permissions are seeded. Full-text forum
  and study search are hidden until a search backend is configured. Blog, coaches,
  teams, tournaments and other unsupported navigation entries are removed.
- Footer community link is the owner's existing Flotilla Mute Chess room:
  https://app.flotilla.social/spaces/mobilemaia.spaces.flotilla.social/foflaythin5.
- Puzzle Storm and Streak use the existing verified CC0 puzzle catalog and native
  selection, clocks, scoring, validation and progress. They receive no solving hints
  from Maia. Ordinary puzzle review keeps the Maia integration after completion.
- Basics, coordinates and practice keep native interaction and progress. The
  licensed practice subset and safe import process are documented in `learning/`.
  Empty courses are omitted and completion percentages use the installed total.
  All 229 chapters are qualified through the native chapter loader.
  Native studies retain ownership/access checks; new chapters and root resets
  reject variants, including variant PGNs. Maia does not reveal practice solutions.
- Current games select active human-versus-Maia pool games using authoritative
  native Game objects, never private player URLs. Native miniature boards, clocks,
  live updates and watcher pages are reused. The visible listing checks for new
  games every 15 seconds and shows an honest empty state.
- Native display, clock, behavior, privacy and notification forms use their original
  autosave and local preference behavior. Unused more-time, takeback, challenges,
  social DMs/following, insight sharing, push/email notifications and auto-chat
  controls are hidden with required values preserved. Direct-routing controls stay
  unavailable because this deployment uses Cloudflare. Profile names, Nostr login,
  2FA and session security are unchanged. API token routes stay unavailable.

Public routing is method-scoped for these added surfaces and covered by gateway
integration checks. Native controllers still enforce authentication, CSRF, ACLs
and validation. New data bootstrap is additive; it must never reset user data.

# Quiet Signal review evidence

Automated checks on 29 October 2026:

- Native UI: 281 tests passed, including existing Maia, analysis, puzzle and stacked-premove regression coverage.
- Native TypeScript, Sass, CSS and JavaScript build passed for site, lobby, analysis, round, editor, dasher and puzzles (plus their dependencies), using Node 24.22.1 and pnpm 12.9.0.
- Nostr adapter: 12 tests passed. Analysis client cancellation/deadline checks passed.
- Public service contracts: 4 tests passed. Puzzle catalog: 2 tests passed.
- Browser login bundle builds; deployment Python parses; changed board SCSS passes stylelint.
- The complete native patch applies cleanly to pinned upstream `b551752d2a0e7a63459d9812825d95a633a98737`, with added-line whitespace validation.
- Changed Scala templates/preferences parse and format with the upstream Scalafmt 3.11.5 configuration. All 15 exported assets reproduce byte for byte and match their native copies.

The upstream UI build's URL handling does not support spaces in its source path. The build ran in a temporary mirror with an unescaped path; no upstream build-tool change is included here.

## Browser previews

These are automated Chrome previews of the existing native pages with the PR's locally compiled CSS, local logo/board assets, and corresponding brand template changes injected into the read-only HTML response. They are not screenshots of a deployed PR or a newly compiled Scala server. Network writes and WebSockets were blocked; no account was created and no game started. Native live lobby content appears as returned by the server.

- [Lobby, dark](screenshots/lobby-dark.png) / [light](screenshots/lobby-light.png)
- [Analysis, dark](screenshots/analysis-dark.png) / [light](screenshots/analysis-light.png)
- [Sign in, dark](screenshots/login-dark.png) / [light](screenshots/login-light.png)
- [Mobile lobby, 390 px](screenshots/lobby-mobile.png)

Checks covered loaded header assets, theme changes that replace the HTML class list, expected palette/board selection and absence of horizontal overflow. The compact knight remains visible on mobile. The sign-in action's computed contrast is 8.99:1 in dark mode and 6.22:1 in light mode.

The PR does not claim a full Scala server compile, human gameplay testing or deployment verification. Exercise sign-in, saved preferences, analysis and a bot game on the compiled staging application before release, following the repository's existing release discipline.

# README feature captures

## November 2, 2026

Actual browser captures of https://mutechess.org/ on 2 November 2026 (JST),
using the dark Quiet Signal appearance and a 1440 × 1000 desktop viewport.
The deployed revision header was not recorded for these captures.
The temporary viewport override was reset afterward.

- `2026-11-02-nostr-login.jpg`: public sign-in page. No key was generated,
  imported, revealed or entered; no owner account was used.
- `2026-11-02-stacked-premoves.jpg`: the native board menu with “Allow multiple
  premoves” enabled, in one anonymous casual game. It illustrates the setting,
  not a staged or fabricated queued sequence. The game was aborted after the
  bot's opening move; no rating was affected and no game was left running.
- `2026-11-02-maia-analysis.jpg`: a standalone Ruy Lopez position after
  `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6
  8. c3 O-O`. Real completed Maia 1500/2400 results and Stockfish output are
  visible. Values are illustrative model/search results, not calibration claims.
- `2026-11-02-bot-profile.jpg`: Wintermute's public profile and real speed ratings,
  fixed settings, game history and Circuit Knight flair. Ratings and activity
  naturally change over time.

## November 22, 2026: Maia Lab

The two `2026-11-22-maia-lab-*.jpg` images are direct live captures of
https://mutechess.org/analysis at the browser's existing 322 × 814 viewport.
The site reported revision `2b925bd25d67753c9f1481667dd89f558ea5403e` in its
`X-NoSweat-Revision` header. No viewport override was applied.

- `2026-11-22-maia-lab-chart.jpg`: the starting position in Maia Lab's
  **Moves by rating** tab after the description and rating sweep completed.
- `2026-11-22-maia-lab-map.jpg`: the same position in **Move map**.

Both use the real 5M model, move history on, a Lab viewing rating of 1500 and six
candidates. They show the upper part of the scrollable dialog; the preview board
and further move details are below the fold. Values are model/search examples,
not measured human success rates. No game or account was created.

The live review also checked candidate selection and **Explore selected move**;
the selected `d4` entered the standalone analysis line, while the original
Maia 1500/2400 channel settings remained unchanged.

## Image provenance

The JPEGs are direct browser screenshots, with no repainted UI or compositing.
The gallery in `flairs/` contains the six existing 60 × 60 lossless WebP assets
extracted unchanged from the checked-in native patch. They are artwork examples,
not screenshots or newly generated assets. Original source art and attribution:
[design/bot-flairs](../../design/bot-flairs/README.md).

Capture and visual review were performed with Codex browser tools. No passwords,
private keys, cookies, session URLs, owner-only profile fields or browser chrome
are included in the images.

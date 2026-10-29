# Mute Chess — Quiet Signal

The owner selected Quiet Signal on 29 October 2026: a calm, understated cyberpunk identity for free chess against human-like Maia opponents. The native Lichess interface remains the foundation.

**Stay human. Play bots.**

| Role          | Dark                  | Light     |
| ------------- | --------------------- | --------- |
| Page          | `#101719`             | `#EEF2E9` |
| Surface       | `#1C2728`             | `#FAFBF6` |
| Text          | `#E7E9DC`             | `#24312D` |
| Action / link | `#A7D6BB`             | `#315F4D` |
| Action label  | `#101719`             | `#FFFFFF` |
| Board         | `#C7CFBA` / `#668478` | same      |

The eyeless knight has one open horizontal interruption. It works in one color, including at favicon size. The lowercase wordmark is Space Grotesk SemiBold (600), converted to outlines; clients need no additional webfont. Keep native UI fonts, iconography, board controls and functional warning/check/annotation colors. Light mode uses a deeper green to keep links and action labels readable. Transparent backgrounds remain available.

New users receive the moss board as a native board theme. Existing saved choices remain available and are not overwritten. The brand scope is a persistent HTML data attribute: native theme switching replaces the HTML class list and must not remove the brand.

## Source and reproduction

`build.py` generates the original SVG mark and outlined lockups. `board.svg` and `quiet-signal.css` are the authoritative board/theme sources. Final exported assets are under `../logo-explorations/final/`; deployed copies are carried in `deploy/lila/patches/lila-nostr-maia.patch`.

From the repository root, with Python 3 and Node 24:

```sh
python3 -m venv .venv-brand
.venv-brand/bin/pip install -r design/quiet-signal/requirements.txt
.venv-brand/bin/python design/quiet-signal/build.py --native-dir /path/to/patched/lila
npm ci --ignore-scripts --prefix design/quiet-signal
node design/quiet-signal/render.mjs --native-dir /path/to/patched/lila
python3 deploy/public/native-source.py /path/to/patched/lila > deploy/lila/patches/lila-nostr-maia.patch
```

Omit `--native-dir` to update only the exported design assets. The renderer creates PNG app icons, the social card, the fallback favicon and a web app manifest. Font source/license/checksums are in `../../third-party/space-grotesk/`. Sharp is a pinned development dependency only.

The original concept study was AI-generated with the owner's requested direction: “Nostr. Cyberpunk. AI chess. Chilling. Lichess. FOSS.” The owner then requested “mockups for logo, colors” for mutechess.org and selected Quiet Signal. This implementation uses original code-native vector geometry and font outlines, with Codex assistance; it does not ship the concept bitmap. It is an independent fork's identity, not an upstream Lichess submission.

## Scope

This change updates the header and sign-in logos, favicons/app icons (including the native turn alert and browser notification), share card, native palette and default board. Existing internal identifiers, browser storage, Nostr identity and security secrets, repository URLs, the rebrand’s prepared domain/origin configuration and service/data paths remain intact. Authenticator enrollment retains the Mute Chess issuer from the rebrand; existing codes continue to use their existing secrets.

The domain migration is separate. Neuromancer/cyberpunk Easter eggs are still ideas and are not introduced by this visual refresh.

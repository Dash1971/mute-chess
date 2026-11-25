# Documentation follow-up evidence — November 25, 2026

Read-only review for [#398](https://github.com/Dash1971/mute-chess/issues/398).
No application build, deployment, service change, wallet payment or device scan
was performed for this documentation task.

## Active renderer and QR rendering

The active release identifies native commit
`a372615f8a1fe3f6d48ba60913c44d7b6b40da48`. The `nosweatchess-gif` unit returned
`active`. The installer configures Lila's `game.gifUrl` at loopback port 6175;
the public gateway forwards native HTTP to Lila, which calls the renderer.
The architecture diagram's direct gateway-to-renderer arrow was incorrect.
This observation establishes the service is installed/running; it is not a
fresh end-to-end GIF-export acceptance test or a new capacity measurement.

At that native pin, `ui/bits/src/bits.qrcode.ts` uses a four-module margin and
sizes its canvas using `devicePixelRatio`. The active compiled manifest identifies
`bits.qrcode.KYBZR5AU.js`; the public site served that bundle and it contained
both changes:

- URL: [deployed QR bundle](https://mutechess.org/assets/compiled/bits.qrcode.KYBZR5AU.js).
- Size: 65,480 bytes.
- SHA-256: `d57e28dc242b089a6e230af516970d573eff1e9b88002b0e03de3f3619f837d4`.

PR #249 was closed without merging, and #247 remains open, but those statuses
do not establish deployed code. The served bundle confirms the rendering changes
are already shipped. The old guide's undeployed status is superseded. No claim
of compatibility with every Phoenix device, successful new payment or completion
of #247's separate device-acceptance work is made. Invoice payload, amount,
recipient and receipt/account binding are unchanged by this documentation.

A read-only request to the live About page also confirmed separate list items
linking the Maia3 engine and maiachess.com/frontend repository. The Maia Lab
guide's pending-review/deployment statement for #359 is superseded.

## Historical text and scope

The `docs398-*-history.md` files preserve the prior guides from Mute main
`c6b0bfcc16eab2d03f7a7f8858901dcd1913ae7c`, with relative links adjusted for their
new location. Old study holds and PR limitations describe their original work.
Current guides describe current contracts and retain their published heading URLs.

The October 29 Quiet Signal verification keeps its original body and patch-based
provenance, with a dated banner added. Existing decision/data/incident records
are not rewritten. The November 25 runtime-security record remains intact;
its separately linked [completion addendum](runtime-security-completion-2026-11-25.md)
records the result reported in the deployment-independent maintenance receipt.

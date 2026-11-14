# Capture and input QC

This is a **documentation-only** reference to each app’s existing behavior. The earlier proposed Mute implementation was removed, and its experimental screenshots are not used here. Mute captures use the original helper from f1b93b9.

All 49 inputs are legal and contain the named source pieces. Both chess libraries checked candidate legality; badge examples have a legal preceding move ending on the shown piece. The initial unrelated-board geometry examples are superseded.

There are 98 Flutter and 294 fresh-board Mute captures, plus 21 Mute preference/hand-off captures. All 98 static case/orientation groups are pixel-identical across Mute’s three surface paths. This does not imply equality with Mobile: their source colors/agreements match, while paint order differs in some rows. Six retained-DOM sequences record subsequent update behavior without changing it.

Badge labels are injected to demonstrate all six colors and layers. They are not claims that d3–d4 deserves those labels. Geometry examples show the actual moving pieces.

[All screenshots](gallery.md) · [Capture metadata](validation.json) · [Raw orders and update observations](browser-results.json)

## Visual index

| Case | Expected pieces | Contact sheet |
| --- | --- | --- |
| Sources 00 | d4: white rook | [Sheet 1](qc-01.png) |
| Sources 01 | d4: white rook | [Sheet 1](qc-01.png) |
| Sources 02 | d4: white rook | [Sheet 1](qc-01.png) |
| Sources 03 | d4: white rook | [Sheet 1](qc-01.png) |
| Sources 04 | d4: white rook | [Sheet 2](qc-02.png) |
| Sources 05 | d4: white rook | [Sheet 2](qc-02.png) |
| Sources 06 | d4: white rook | [Sheet 2](qc-02.png) |
| Sources 07 | d4: white rook | [Sheet 2](qc-02.png) |
| Sources 08 | d4: white rook | [Sheet 3](qc-03.png) |
| Sources 09 | d4: white rook | [Sheet 3](qc-03.png) |
| Sources 10 | d4: white rook | [Sheet 3](qc-03.png) |
| Sources 11 | d4: white rook | [Sheet 3](qc-03.png) |
| Sources 12 | d4: white rook | [Sheet 4](qc-04.png) |
| Sources 13 | d4: white rook | [Sheet 4](qc-04.png) |
| Sources 14 | d4: white rook | [Sheet 4](qc-04.png) |
| Sources 15 | d4: white rook | [Sheet 4](qc-04.png) |
| Sources 16 | d4: white rook | [Sheet 5](qc-05.png) |
| Sources 17 | d4: white rook | [Sheet 5](qc-05.png) |
| Sources 18 | d4: white rook | [Sheet 5](qc-05.png) |
| Sources 19 | d4: white rook | [Sheet 5](qc-05.png) |
| Sources 20 | d4: white rook | [Sheet 6](qc-06.png) |
| Sources 21 | d4: white rook | [Sheet 6](qc-06.png) |
| Sources 22 | d4: white rook | [Sheet 6](qc-06.png) |
| Sources 23 | d4: white rook | [Sheet 6](qc-06.png) |
| Sources 24 | d4: white rook | [Sheet 7](qc-07.png) |
| Sources 25 | d4: white rook | [Sheet 7](qc-07.png) |
| Sources 26 | d4: white rook | [Sheet 7](qc-07.png) |
| Sources 27 | d4: white rook | [Sheet 7](qc-07.png) |
| Sources 28 | d4: white rook | [Sheet 8](qc-08.png) |
| Sources 29 | d4: white rook | [Sheet 8](qc-08.png) |
| Sources 30 | d4: white rook | [Sheet 8](qc-08.png) |
| Sources 31 | d4: white rook | [Sheet 8](qc-08.png) |
| reported-J2VCe | h1: black queen, c8: black rook | [Sheet 9](qc-09.png) |
| badge-brilliant | h8: black bishop, d4: white pawn | [Sheet 9](qc-09.png) |
| badge-good | h8: black bishop, d4: white pawn | [Sheet 9](qc-09.png) |
| badge-interesting | h8: black bishop, d4: white pawn | [Sheet 9](qc-09.png) |
| badge-dubious | h8: black bishop, d4: white pawn | [Sheet 10](qc-10.png) |
| badge-mistake | h8: black bishop, d4: white pawn | [Sheet 10](qc-10.png) |
| badge-blunder | h8: black bishop, d4: white pawn | [Sheet 10](qc-10.png) |
| diagonal | a1: white bishop, h1: white bishop | [Sheet 10](qc-10.png) |
| knight | b1: white knight, g1: white knight | [Sheet 11](qc-11.png) |
| opposite | d4: white rook | [Sheet 11](qc-11.png) |
| promotion | e7: white pawn | [Sheet 11](qc-11.png) |
| castling | a1: white rook, e1: white king, h1: white rook | [Sheet 11](qc-11.png) |
| same-destination | d4: white rook, e5: white rook, f3: white bishop | [Sheet 12](qc-12.png) |
| short-long | a1: white rook | [Sheet 12](qc-12.png) |
| sf-taper | h1: black queen, c8: black rook | [Sheet 12](qc-12.png) |
| small-board | h8: black bishop, d4: white pawn | [Sheet 12](qc-12.png) |
| Qh5-shorter | h1: black queen, c8: black rook | [Sheet 13](qc-13.png) |

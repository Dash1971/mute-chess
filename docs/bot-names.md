# Public bot names

The owner-approved draft for #322 replaces the remaining 181 generic
`SignalTrain` / `SignalTest` labels with distinctive public aliases. The 12
existing aliases remain, bringing the legacy alias table to 193 entries. A further
157 existing generated-name bots receive aliases, for **350 distinctive aliases**
in total. This includes 20 Wipeout team/track names and 33 electronic-music names.

Names mix Judge Dredd/2000 AD, Blade Runner, William Gibson, True Names,
Star Trek, Akira, The Matrix, 2001, Terminator, Alien, Metal Gear, Deus Ex,
Marathon, System Shock, Portal, Detroit: Become Human, NieR: Automata,
Ghost in the Shell, TRON and RoboCop with early computing pioneers, Wipeout
teams/tracks and electronic music.
Examples include Data, Lore, Locutus, Solid Snake, Otacon, Alan Turing,
John von Neumann, Ada Lovelace and Grace Hopper. These are homages, with
no affiliation or endorsement. Proper names stay the same across locales.

Wipeout examples include FEISAR, Qirex, Goteki 45, Icaras, Talon’s Reach and
Spilskinanke. Music references include Chemical Brothers, The Prodigy, Underworld,
Orbital, Fluke, FSOL and CoLD SToRAGE. Chemical Brothers is shortened to fit the
existing 20-character display limit. The native initializer accepts the original
catalog display name when applying a new alias, preserving custom chosen names
and existing unique-name reservations. Existing themed-flair behavior also applies.

The mapping is reviewable in [catalog-aliases.json](../lila-adapter/catalog-aliases.json).
[catalog-names.json](../lila-adapter/catalog-names.json) records its source
categories and retains the original names used by the catalog generator.

Only public display aliases change. Canonical account IDs, usernames, profile
URLs, policies, rating priors, earned ratings, game counts, games and histories
stay intact. The 9,750 added catalog identities remain byte-for-byte unchanged.
Native BOT labels remain visible, and the existing initializer applies aliases
through the normal unique-name reservation rules; a conflicting human name must
fail rather than be overwritten.

At the owner's request, **Elon Musk** is assigned to `SignalTrain029`, an existing
lower-rated account (Rapid 835 in the frozen October 2026 reference snapshot).
This assigns a name to a recorded rating; it does not lower or reset a live rating.
Current earned ratings can differ from that historical snapshot.

Keep the change draft. No live account writes or deployment are part of this PR.

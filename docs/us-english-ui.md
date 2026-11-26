# English UI policy

**English means US English in Mute Chess.** This applies to inherited UI labels,
help, titles, accessibility announcements and Mute-specific text. It is an
intentional difference from Lichess's source-English wording.

## Native locale selection

Use Lichess's existing `en-US` catalogs. Mute's English picker choice is
**English (US)**. Saved English preferences and sessions, including `en-GB`,
normalize to `en-US`; requests without a supported preference also select US
English. The other nine supported languages are unchanged. No separate language
setting or migration is needed.

Keep the upstream source catalogs intact. Native server and browser translation
handling already falls back to source English for Mute messages absent from
`en-US`. Write those Mute-owned source messages in US English. Fix inherited US
translation gaps in `translation/dest/*/en-US.xml`, rather than maintaining a
second rewrite of the source catalogs. Preserve native keys such as
`premoveCancelled`, `/analyse` routes, protocol values, proper names and quotes.

New or substantively changed Mute messages still need translations in all ten
supported languages. Spelling-only corrections retain equivalent translations.
Existing English-only metadata keeps its whole-sentence construction; changing
one word must not produce a sentence that mixes languages.

## Checks and release status

`NoSweatLanguagesTest` checks English normalization, fallback, the picker label,
and representative translations. A focused word-list check scans compiled US
English overlaid on source fallback, so upstream merges can expose common British
spellings that need a US correction. It is a regression guard, not an exhaustive
language audit. Existing native locale tests cover Insights, Arenas and rematches;
the native build compiles the client catalogs and their typings.

US English has been live since November 26, 2026. The
[verified deployment record](records/release-2026-11-26.md) records the serving
identities, legacy-preference normalization and successful About-page checks in
all ten locales, including `en-US`. See [release history](releases.md) for the
indexed deployment evidence.

See the [upstream differences](upstream-alignment.md#supported-differences),
[maintenance overview](maintenance.md#what-we-keep-different) and
[exact departure register](../deploy/lila/upstream-departures.json).

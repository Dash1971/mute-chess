# Native learning and community bootstrap

The native Lichess basics and coordinates courses need no imported users or games.
Practice lessons come from the MIT-licensed official
[lichess-org/lila-db-seed](https://github.com/lichess-org/lila-db-seed/tree/b5d06f115c51d6f12167b9629fb21f087bf2e833)
revision pinned in catalog.json. Its destructive development seeder is never run.
Decode only `spamdb/data/study.bson` and `study_chapter_flat.bson` with MongoDB's
`bsondump`, then run `prepare.py STUDIES.jsonl CHAPTERS.jsonl PracticeSections.scala`.
This selects 20 courses/229 chapters available in that snapshot; the native course
index omits absent courses rather than advertising unavailable lessons.

The preparation removes all contributor memberships and popularity statistics,
uses the reserved, unclaimable `lichess` technical owner and disables lesson chat.
Lesson positions, variations, explanations and original author attributions remain.
No account, admin role, signing key, fake post, password or game is imported.

`import.py DATABASE --mongosh /absolute/path/to/mongosh.js` verifies hashes and
standard-chess ownership constraints first. It accepts only the isolated private
and public application databases. The Mongo script preflights ID collisions before
writes and inserts missing lessons only. Existing marked lessons and learner
progress are preserved. It also inserts three empty native forum categories if
absent; existing counters, topics and posts are never replaced.

Keep this directory and LICENSE.md in every corresponding-source distribution.

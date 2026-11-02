# Missing frontend manifest during the Nostr release, 2 November 2026

Issue: [#214](https://github.com/Dash1971/mute-chess/issues/214).

## Failure and responsibility

Release `373753b3da059bb178eb0e26e167fec49194ce79` was selected while
`lila/public/compiled/manifest.json` was absent. The application could start and
the homepage could return HTTP 200, but that did not establish that the frontend
was complete. The application journal reported `NoSuchFileException` for the
manifest. The owner reported the broken site before browser acceptance completed.

The deployment decision was wrong. A zero exit status from the UI command was
accepted as sufficient evidence, and the staged release was switched without
checking that its required asset manifest and referenced files existed. CI source
checks, backend compilation, release metadata and a root HTTP response could not
substitute for that artifact check. This was the agent's validation failure.

The owner identified this as a second major deployment failure. That makes the
failure to validate the candidate especially serious. This record establishes
the cause of this incident; it does not claim the earlier incident had the same
technical cause without evidence.

## Technical cause

The native UI builder has a non-watch completion race:

1. `ui/.build/src/esbuild.ts` runs the bundle through `makeTask` with
   `noEnvStatus: true`.
2. Its esbuild `onEnd` hook calls `env.setStatus('esbuild', 0)` before
   `makeTask` has finished awaiting the build/disposal and marked the bundle task
   `status = 'ok'` in `task.ts`.
3. If esbuild finishes last, `env.buildOk()` still sees the pending bundle task.
   `writeManifest()` returns without writing. It retains its dirty state.
4. Once the bundle task is marked complete, `noEnvStatus` prevents a second
   status update. No later callback retries the manifest. The process can exit
   zero despite the missing manifest.

The failed build log records TypeScript, Sass and i18n finishing before esbuild
at 22:04:35 JST, with no final `Done in` or manifest output. By comparison, the
previous successful a16 build finished esbuild at 20:25:38, then completed other
work at 20:25:42 and wrote its manifest. The timing difference explains why the
same invocation previously worked. It was not proof the procedure was reliable.

## Recovery and bounded correction

The previous a16 release was restored through the existing rollback procedure.
Its manifest and sampled real CSS/JavaScript asset URLs returned successfully;
the homepage and owner's profile loaded in a fresh browser tab. Bot admissions
remain paused at the owner's request. No users, keys, ratings, histories or games
were reset, and no test games were created for recovery.

The immediate repair uses one frontend-only build with the already compiled
backend. The failed candidate is retained; the corrected candidate must contain
the actual generated manifest and every referenced file before it is selected.
An old manifest must never be copied over a differently hashed frontend.

The source correction calls the existing `updateManifest()` after the existing
`Promise.all` of UI build tasks resolves. All task completion states are then
committed. The existing writer and `buildOk()` checks remain authoritative, and
its existing timer/file writes keep Node alive until writing completes. No new
manifest format, release framework, backup system or build dependency is added.

The release-specific pre-switch check must reject a missing/unreadable manifest
or any missing file referenced by it, even when build commands exit zero. This
is a check of the actual staged artifact, before changing the current release.

## Verification record

Two independent source reviews confirmed the callback/task-state ordering above.
A focused execution of the actual native `makeTask`, `env` and manifest writer
reproduced the missing file while the last bundle task was pending, confirmed
that final completion emits the manifest, and confirmed that an unsuccessful
build still cannot publish one. No alternative writer or mocked manifest was
used. The native departure-register checks and all five register tests pass;
the changed TypeScript file passes the existing formatter.

The unchanged frontend-only recovery build subsequently finished in 8.9 seconds
and emitted both `manifest.cbea6335.js` and `manifest.json`. The complete artifact
check and repaired-release results are recorded here after verification; a
successful recovery build alone is not being described as a successful deployment.

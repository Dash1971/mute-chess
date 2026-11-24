# Contributing to Mute Chess

Start with the [README](README.md), [architecture](docs/architecture.md) and
[maintenance guide](docs/maintenance.md). Open an issue before substantial work
so scope and native integration can be agreed. For vulnerabilities, use
[private reporting](SECURITY.md), not a public issue.

## Choose the repository

- Adapter, deployment, documentation or data changes: a focused PR against this
  repository's `main` is sufficient.
- Native application changes: open an issue here, then a PR against
  [Dash1971/lila `main`](https://github.com/Dash1971/lila). After its checks,
  review and merge, open a companion PR here updating `native-pin.json` and any
  affected departure register/docs. The companion closes the issue.
- Never modify the fork's upstream `master`, rebase deployed history or mix an
  upstream merge with an unrelated feature. See [the source contract](docs/native-fork.md).

Use a short-lived topic branch. Our agent-created branches use `codex/`; outside
contributors do not need that prefix or access to the owner's workspace/hosts.
Keep changes small and preserve native chess, identity, privacy and data rules.

## Set up and check your change

For documentation or adapter unit work, no model download or public host access
is needed. Use Node 24.22.1, Python 3.14 (as in CI) and the committed dependency locks. From the
repository root, the existing CI commands include:

```sh
(cd lila-adapter && npm ci --ignore-scripts && npm test)
node analysis/test-client.mjs
node --experimental-vm-modules --no-warnings analysis/test-worker.mjs
node learning/test-import.mjs
python3 -m unittest discover -s puzzles
python3 -m unittest discover -s learning
python3 -m unittest discover -s deploy/public -p 'test_*.py'
python3 -m unittest discover -s deploy/lila -p 'test_*.py'
git diff --check
```

For the Python encoder/predictor tests, install `lila-adapter/requirements.txt`
in a virtual environment, then run from `lila-adapter/`:

```sh
PYTHONPATH=.:test python3 -m unittest \
  test_worker.WorkerTests.test_history_and_black_orientation \
  test_worker.WorkerTests.test_deterministic_temperature_and_top_p_zero_endpoints \
  test_strength_predictor
```

Run checks relevant to your change; CI is the complete authoritative command list
in [checks.yml](.github/workflows/checks.yml). Its additional checks parse scripts,
build the login bundle, reproduce frozen catalog/study data and verify the native
pin/departure register. `python3 deploy/lila/check-upstream.py` fetches source
objects unless `--native /path/to/lila` supplies an existing checkout. Native UI,
Scala and renderer builds run in the existing CI jobs; use the
[installation guide](docs/installation.md) for a complete isolated Ubuntu stack.
Do not run maintenance, calibration or live-account tests as ordinary unit tests.

## Documentation, translations and review

Use US English in prose. New or changed application UI text must use the native
catalogs and ship in all ten supported locales, with key/placeholder parity and
localized rendering checked. Product documentation should explain observable
behavior; place dated experiment/build evidence in `docs/records/` or its existing
evidence location. A merged change may still be unreleased: label that accurately.

Describe the problem, resulting behavior, linked issue and checks in your PR.
Distinguish automated fixtures from live verification and human acceptance.
Preserve upstream credits/licenses, and disclose AI assistance when used.
[AGENTS.md](AGENTS.md) contains additional instructions for repository agents;
this guide does not require a contributor to have its parent workspace.

A PR or merge does not authorize a deployment. Public releases use the owner's
existing reviewed procedure and actual security verification.

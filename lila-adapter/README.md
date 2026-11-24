# Mute Chess adapter

This private Node service connects native Lila to the Python Maia3 opponent
worker, verifies Nostr login/action signatures and handles Lightning patron
invoice/receipt checks. Lila remains responsible for legal moves, clocks,
permissions, ratings and persistence. Browser analysis is separate; see the
[architecture](../docs/architecture.md).

## Development and tests

Use Node 24.22.1 and the committed `package-lock.json`. From this directory:

```sh
npm ci --ignore-scripts
npm test
```

The Node suite uses fixtures and mocks; it does not start the public service or
download model weights. Encoder/predictor checks use the pinned Python packages
in `requirements.txt`; see [contributing](../CONTRIBUTING.md). Model-dependent
reference and live integration tests require their explicit private fixtures.
Do not point them at the public site or an existing user's account.

For a runnable private stack, follow [installation](../docs/installation.md).
`configure-adapter.py` writes a private environment file without printing the
token; `start-adapter.sh` starts the existing transient user service. Starting
`server.mjs` alone requires a healthy native stack and the pinned external model.

## Runtime configuration

| Variable | Meaning |
| --- | --- |
| `ADAPTER_TOKEN` | Required shared native/adapter secret, at least 40 characters; never commit or print it |
| `LILA_ORIGIN` | Native HTTP origin; defaults to `http://127.0.0.1:19663` and must use `127.0.0.1` |
| `PUBLIC_ORIGIN` | Browser-facing origin used for Nostr signatures and native Host; defaults to `LILA_ORIGIN` |
| `ADAPTER_PORT` | Loopback listener port; defaults to `19665` (public host uses `29665`) |
| `MAIA_PYTHON` | Python executable in the prepared inference environment |
| `MAIA_MODEL` | External Maia3 79M ONNX model path; SHA-256 is checked against `maia.mjs` |

The worker constrains its numerical-library threads through the existing child
process environment. Native admission and capacity control remain authoritative.
Private health requests also require the shared token. Never expose the adapter
listener directly to the internet.

## Catalog data

`roster.mjs` combines the preserved reference cohort with the assigned catalog.
`catalog-aliases.json` contains display aliases. After clean native build/source
verification, stage runtime files using:

```sh
node stage-catalog.mjs /absolute/path/to/assembled/lila
node stage-catalog.mjs --verify /absolute/path/to/assembled/lila
```

The native fork requires both outputs. They are assembled runtime data, not
tracked native source. Follow the [development cleanup rules](../docs/installation.md#5-install-the-adapter-and-build-the-site)
before the next clean-source verification. See [catalog methodology](../docs/catalog-roster.md).

## Historical study configuration

`study.mjs` is a separately gated research driver, not part of normal startup.
Old approved budgets are not permission to start another run.

| Variable | Historical driver contract |
| --- | --- |
| `STUDY_WORKERS` | One or two workers; default one, within the separately approved compute budget |
| `STUDY_RUN_ID` | Explicit bounded run identifier, checked against the native scope |
| `STUDY_PUBLIC_RATINGS` | Literal `true` targets the public-rating scope; otherwise private qualification |
| `STUDY_OUTPUT` | Required absolute evidence directory |
| `STUDY_MAIN_COMMIT` | Required full verified Mute main SHA |
| `STUDY_PREDECESSOR` | Only the explicitly allowed continuation profile; rejected for other profiles |

The driver also requires explicit `LILA_ORIGIN`, `ADAPTER_TOKEN`, `MAIA_PYTHON`
and `MAIA_MODEL`. Its time, game, identity and predecessor guards are documented
in the [dated study records](../docs/records/README.md). This page intentionally
provides no command to launch another public calibration run.

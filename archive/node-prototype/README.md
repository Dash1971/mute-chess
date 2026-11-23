# Retired Node prototype

This Fastify/PostgreSQL prototype was retired on 28 October 2026. It is not
Mute Chess's current runtime. Do not restart or deploy it as the current site.
Source, dependency locks, assets and original service/test helpers are retained
here for history and reproducibility. Run historical commands from this folder;
the root source packager remains at `../../scripts/package-source.py`.

The current native Lila application is in [the fork](https://github.com/Dash1971/lila).
See [installation](../../docs/installation.md) and [native development](../../deploy/lila/README.md).
The active adapter has its own unchanged Python pins in
[`lila-adapter/requirements.txt`](../../lila-adapter/requirements.txt).

The historical legal-logit reference fixture remains here and is also used by
the adapter's explicitly model-dependent reference regression. No historical
worker or app source is silently substituted for the live adapter.

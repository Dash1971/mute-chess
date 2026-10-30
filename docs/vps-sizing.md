# Budget VPS sizing — October 30, 2026

Start by evaluating an **x86-64 VPS with 4 vCPUs, 8 GB RAM and 75–100 GB NVMe**. A server budget around **US$10–15/month**, with a little extra for independent encrypted backups/tax where applicable, is a reasonable launch target. A six-vCPU option around $12–15 can be attractive if its CPU performance is comparable. No GPU, managed database or cluster is required by the measured workload.

The following are **modeled human-player capacities**, not a completed human-client load test. They assume the bounded production queue in [#96](https://github.com/Dash1971/mute-chess/issues/96), adequate bot identities, and a candidate CPU delivering comparable or better Maia inference throughput. Normal public play currently retains its original two-game cap; the 10/22 study plans are separately gated. The current 44 identities also limit simultaneous human-versus-bot matches to at most 44 until roster expansion.

| Suggested machine | Model setup to evaluate | Rough active Blitz/Rapid games | Very fast Bullet estimate |
| --- | --- | ---: | ---: |
| 4 vCPU / 8 GB / 75–100 GB NVMe | One two-thread worker | 30–60 | 5–15 |
| 6 vCPU / 12 GB / 100 GB NVMe | Two workers, four logical CPUs combined | 50–100 | 10–25 |
| 8 vCPU / 16 GB / 160 GB NVMe | Same two workers with more operational headroom | Similar 50–100 initially | Similar 10–25 initially |

These are simultaneous **playing** users. Registered accounts and users browsing profiles/history impose a different, much lighter inference load. A large account population does not itself allocate a model per account. More than the current roster's 44 human games needs more identities. The eight-vCPU tier does not automatically double throughput while keeping the same two-worker configuration; spend more only when measured demand justifies another worker or extra operational capacity.

## How the estimates were obtained

[Run one](data/bot-trials/r20261030a/README.md) measured about **6.8 native plies/second** with one worker at two/five/ten simultaneous BOT-versus-BOT games. [Run two](data/bot-trials/r20261030b/README.md) observed up to 21 games with two workers; the final target stage averaged about **9.3 plies/second**. Both seats request immediate inference in these games. A human game requests inference for the bot's turns and includes human thinking and configured bot timing.

For rough planning, budget approximately **4.5–5 bot replies/second** from the one-worker configuration and **7–8/second** from two workers. That leaves roughly 15–30% throughput headroom relative to these observations, rather than reserving most of the machine unused. Then:

```text
active games ≈ usable bot replies/second × average seconds between bot turns per game
```

Assuming a mixed Blitz/Rapid session asks for a bot move roughly every **6–12 seconds**, the order of magnitude is a few dozen active games on the smaller machine and around 50–100 with two workers. Very fast Bullet, rapid clicking and stacked premoves can ask every **1–3 seconds** and require shorter reply queues, hence the lower estimate. Slower Rapid/Classical can support more active games than the mixed estimate. These turn intervals are explicit planning assumptions; collect real player cadence before treating them as measured behavior.

The measured host is an **Intel i7-3720QM with four physical cores/eight hardware threads**, approximately 15 GiB RAM. [Intel lists its launch as Q2 2012](https://www.intel.com/content/www/us/en/products/sku/64891/intel-core-i73720qm-processor-6m-cache-up-to-3-60-ghz/specifications.html). The reports' CPU equivalents use Linux logical CPU time. Four used hardware threads do not imply four additional physical cores of spare compute. Modern VPS vCPUs, CPU generation and shared-host contention need a direct throughput check; this older host is a useful baseline, not a universal vCPU conversion.

A separate forum compilation overlapped part of run two. The report retains those samples and host context. Peak sampled chess-worker/native-service memory was **2.24 GiB** in run one and **2.77 GiB** in run two. Eight GB provides practical space for the OS, native JVM, MongoDB, Redis, model worker and cache. Four GB would require tighter heap/cache tuning and leaves less burst room; the small saving is not the initial recommendation. Build releases in CI/on the existing build machine, then install verified artifacts on the VPS to keep compilation out of production capacity.

## Current price examples

Checked October 30, 2026; advertised starting prices, not a checkout quote. Region, contract term, tax, stock and provider CPU allocation matter.

| Example | Advertised configuration | Advertised monthly starting price |
| --- | --- | ---: |
| [OVHcloud VPS-2](https://www.ovhcloud.com/en/vps/) | 4 vCores, 8 GB RAM, 75 GB NVMe, IPv4 and daily VM backup | US$8.50 |
| [OVHcloud VPS-3](https://www.ovhcloud.com/en/vps/) | 6 vCores, 12 GB RAM, 100 GB NVMe, IPv4 and daily VM backup | US$12.32 |
| [Hetzner CX33 price reference](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) | 4 vCPU, 8 GB RAM, 80 GB NVMe | €8.49 before IPv4/VAT |
| [Hetzner CX43 price reference](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) | 8 vCPU, 16 GB RAM, 160 GB NVMe | €15.99 before IPv4/VAT |

Hetzner's [primary IPv4 adds €0.50 / US$0.60 monthly before VAT](https://docs.hetzner.com/cloud/servers/primary-ips/overview/). Its [cost-optimized listing currently marks CX33/CX43 unavailable](https://www.hetzner.com/cloud/cost-optimized/), so treat those as price comparisons and recheck stock. OVH's advertised [Asia-Pacific traffic allowance is 1 TB for VPS-2/VPS-3](https://www.ovhcloud.com/en/vps/); choose a region and bandwidth allowance appropriate for the first audience and large browser-analysis asset downloads. Provider VM backups complement independently recoverable encrypted database backups.

The cheapest shared plans suit a small, variable audience, but shared CPU performance can change with neighbors. [Hetzner describes shared resources as variable-load options and dedicated vCPUs for sustained workloads](https://www.hetzner.com/cloud/). There is no need to pay for a dedicated/GPU tier before the measured service needs it. Prefer a short qualification on the exact affordable candidate over buying excess RAM or relying on a plan's vCPU label.

## Practical next step

Pick the region and a low-cost 4-vCPU/8-GB or good-value 6-vCPU/12-GB candidate. Before migration, measure the pinned 79M model's sustained replies/second and p95 latency, run native disposable game/clock/Glicko and WebSocket smoke checks, and check RAM during startup. Use those results to choose admission limits. Port the tested fair inference scheduling through #96 before opening dozens of human slots, and expand the bot roster only through the reviewed population work. Keep native rules/ratings and the main → reviewed deployment workflow intact.

No hosting purchase, migration, higher normal-play cap or recurring load job is part of this sizing report.

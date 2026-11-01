// Copyright 2026 Mobile Maia contributors. SPDX-License-Identifier: AGPL-3.0-only
import { CACHE_NAME, encode, sha256 } from "./core.js";
import { backendPlan } from "./backends.js";

let session,
  ort,
  initPromise,
  sessionConfig,
  modelWeights,
  keepAssets = true,
  choices = [],
  cacheName = CACHE_NAME;
const diagnostics = {
  schema: 1,
  modelId: "5m",
  backend: "wasm",
  numThreads: 1,
  graphOptimizationLevel: "all",
  warmupRuns: 0,
  downloads: [],
  inferences: [],
};
const notify = (data) => self.postMessage(data);

async function load(asset, name, keep, report = true) {
  const entry = {
    name,
    expectedBytes: asset.bytes,
    loadedBytes: 0,
    source: "network",
    status: "loading",
  };
  diagnostics.downloads.push(entry);
  const started = performance.now();
  let cache,
    saving = Promise.resolve(),
    reader;
  try {
    if (keep && self.caches) {
      try {
        cache = await caches.open(cacheName);
      } catch {}
    }
    let response = cache && (await cache.match(asset.url));
    if (response) entry.source = "prototype cache";
    else response = await fetch(asset.url, { credentials: "omit", cache: "no-store" });
    entry.httpStatus = response.status;
    if (!response.ok || response.type === "opaque")
      throw new Error(`${name}: HTTP ${response.status}`);
    if (cache && entry.source === "network")
      saving = cache
        .put(asset.url, response.clone())
        .then(() => {
          entry.cacheSaved = true;
        })
        .catch((error) => {
          entry.cacheError = error.name;
        });
    entry.cacheSaved = entry.source === "prototype cache";
    const bytes = new Uint8Array(asset.bytes);
    reader = response.body.getReader();
    let last = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (entry.loadedBytes + value.length > bytes.length)
        throw new Error(`${name}: exceeded pinned size`);
      bytes.set(value, entry.loadedBytes);
      entry.loadedBytes += value.length;
      if (performance.now() - last > 120) {
        if (report) notify({ type: "progress", downloads: diagnostics.downloads });
        last = performance.now();
      }
    }
    entry.transferMs = performance.now() - started;
    if (entry.loadedBytes !== asset.bytes) throw new Error(`${name}: incomplete download`);
    const hashStart = performance.now();
    entry.sha256 = await sha256(bytes);
    entry.hashMs = performance.now() - hashStart;
    await saving;
    if (entry.sha256 !== asset.sha256) throw new Error(`${name}: SHA-256 mismatch`);
    entry.status = "verified";
    if (report) notify({ type: "progress", downloads: diagnostics.downloads });
    return bytes;
  } catch (error) {
    if (reader) await reader.cancel().catch(() => {});
    await saving;
    if (cache) await cache.delete(asset.url).catch(() => {});
    entry.status = "failed";
    entry.error = { name: error.name, message: error.message };
    entry.elapsedMs = performance.now() - started;
    throw error;
  }
}

async function init(config, keep) {
  cacheName = config.browserCacheName || CACHE_NAME;
  const start = performance.now();
  const model = config.models[config.browserModel || "5m"];
  diagnostics.modelId = config.browserModel || "5m";
  diagnostics.startedAt = new Date().toISOString();
  diagnostics.modelSha256 = model.sha256;
  diagnostics.runtimeVersion = config.runtime.version;
  diagnostics.phase = "download";
  sessionConfig = config;
  keepAssets = keep;
  choices = backendPlan(
    diagnostics.modelId,
    !!self.navigator?.gpu,
    self.crossOriginIsolated === true,
    self.navigator?.hardwareConcurrency,
  );
  // Preserve overlapping model/runtime downloads, including the unchanged 5M path.
  const primary = choices[0];
  const firstRuntime = load(
    config.runtime.assets[primary.backend],
    primary.backend === "webgpu" ? "GPU runtime" : "CPU runtime",
    keep,
  ).then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  const loaded = await Promise.all([load(model, model.name, keep), firstRuntime]);
  modelWeights = loaded[0];
  diagnostics.backendAttempts = [];
  const sessionStart = performance.now();
  await prepareBackend(keep, true, loaded[1]);
  diagnostics.sessionCreationMs = performance.now() - sessionStart;
  diagnostics.workerReadyMs = performance.now() - start;
  diagnostics.inputs = session.inputNames;
  diagnostics.outputs = session.outputNames;
  diagnostics.phase = "ready";
  notify({ type: "ready", diagnostics });
}

async function prepareBackend(keep = keepAssets, initializing = true, firstRuntime) {
  let failure;
  while (choices.length) {
    const choice = choices.shift();
    const attempt = { backend: choice.backend, numThreads: choice.threads };
    diagnostics.backendAttempts.push(attempt);
    try {
      const asset = sessionConfig.runtime.assets[choice.backend];
      const moduleUrl = new URL("./" + asset.module, import.meta.url);
      // A fresh CPU runtime instance permits a single-thread retry if pthread startup failed.
      moduleUrl.searchParams.set("threads", String(choice.threads));
      const pending = firstRuntime;
      firstRuntime = undefined;
      const runtime = pending
        ? pending.error
          ? Promise.reject(pending.error)
          : Promise.resolve(pending.value)
        : load(
            asset,
            choice.backend === "webgpu" ? "GPU runtime" : "CPU runtime",
            keep,
            initializing,
          );
      const [module, wasm] = await Promise.all([import(moduleUrl.href), runtime]);
      ort = module;
      if (ort.env.versions.web !== sessionConfig.runtime.version)
        throw new Error("Unexpected runtime version");
      ort.env.wasm.numThreads = choice.threads;
      ort.env.wasm.proxy = false;
      const bounded = diagnostics.modelId === "5m";
      const loader = bounded
        ? new URL("ort-5m-256m.js", import.meta.url)
        : new URL("./" + asset.loader, self.location.href);
      if (bounded) loader.search = new URL(import.meta.url).search;
      ort.env.wasm.wasmPaths = { mjs: loader.href };
      ort.env.wasm.wasmBinary = wasm;
      diagnostics.wasmMemoryMaxMiB = bounded ? 256 : 4096;
      diagnostics.loader = bounded ? "ort-5m-256m.js" : asset.loader;
      diagnostics.phase = "session creation";
      if (initializing) notify({ type: "initializing", diagnostics });
      session = await ort.InferenceSession.create(modelWeights, {
        executionProviders: choice.backend === "webgpu" ? ["webgpu", "wasm"] : ["wasm"],
        graphOptimizationLevel: diagnostics.graphOptimizationLevel,
        executionMode: "sequential",
        enableMemPattern: false,
      });
      diagnostics.backend = choice.backend;
      diagnostics.numThreads = choice.threads;
      attempt.status = "ready";
      return;
    } catch (error) {
      attempt.status = "failed";
      attempt.error = String(error.message || error);
      failure = error;
    }
  }
  throw failure || new Error("No Maia inference backend is available");
}

async function predict(job) {
  await initPromise;
  const args = job.arguments,
    started = performance.now();
  const feeds = {
    tokens: new ort.Tensor("float32", args.tokens, [1, 64, 97]),
    self_elo: new ort.Tensor("int64", new BigInt64Array([BigInt(args.selfElo)]), [1]),
    opponent_elo: new ort.Tensor("int64", new BigInt64Array([BigInt(args.opponentElo)]), [1]),
  };
  let outputs;
  try {
    diagnostics.phase = "inference";
    // Ponder is unused by the app. Fetch only the original policy/value heads.
    outputs = await session.run(feeds, ["move_logits", "value_logits"]);
    const policy = new Float32Array(await outputs.move_logits.getData());
    const values = new Float32Array(await outputs.value_logits.getData());
    if (
      policy.length !== 4352 ||
      values.length !== 3 ||
      !policy.every(Number.isFinite) ||
      !values.every(Number.isFinite)
    )
      throw new Error("Invalid Maia output");
    diagnostics.inferences.push({ ms: performance.now() - started, at: new Date().toISOString() });
    diagnostics.phase = "ready";
    delete diagnostics.failure;
    if (diagnostics.inferences.length > 200) diagnostics.inferences.shift();
    notify({ type: "prediction", id: job.id, policy, values, diagnostics });
  } catch (error) {
    if (!choices.length) throw error;
    diagnostics.backendAttempts.at(-1).inferenceError = String(error.message || error);
    await session.release().catch(() => {});
    // Keep the original inference watchdog: fallback never starts a new session deadline.
    await prepareBackend(keepAssets, false);
    return predict(job);
  } finally {
    for (const tensor of [...Object.values(outputs || {}), ...Object.values(feeds)])
      tensor.dispose();
  }
}
let tail = Promise.resolve();
function fail(error, id) {
  diagnostics.failure = {
    stage: diagnostics.phase === "failed" ? diagnostics.failure?.stage : diagnostics.phase,
    name: error.name,
    message: error.message,
    stack: String(error.stack || "").slice(0, 1500),
  };
  diagnostics.phase = "failed";
  notify({ type: "error", ...(id === undefined ? {} : { id }), error: error.message, diagnostics });
}
self.onmessage = ({ data }) => {
  if (data.type === "init" && !initPromise) {
    initPromise = init(data.config, !data.config.browserQa || data.config.browserOfflineQa);
    initPromise.catch((error) => fail(error));
  } else if (data.type === "predict") {
    tail = tail
      .catch(() => {})
      .then(() => predict(data))
      .catch((error) => fail(error, data.id));
  }
};

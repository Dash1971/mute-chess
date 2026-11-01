// Copyright 2026 Mobile Maia contributors. SPDX-License-Identifier: AGPL-3.0-only
// Keep 5M's bounded CPU path; accelerate the larger model when supported.
export function backendPlan(model, gpu, isolated, cores = 1) {
  if (model !== "79m") return [{ backend: "wasm", threads: 1 }];
  const threads = isolated ? Math.max(1, Math.min(4, Math.ceil((Number(cores) || 1) / 2))) : 1;
  return [
    ...(gpu ? [{ backend: "webgpu", threads: 1 }] : []),
    { backend: "wasm", threads },
    ...(threads > 1 ? [{ backend: "wasm", threads: 1 }] : []),
  ];
}

/** Only against an isolated test instance/database. Scripted input fixtures, no bot-v-bot games. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} from "nostr-tools/pure";
import WebSocket from "ws";
const origin = process.env.TEST_ORIGIN ?? "http://127.0.0.1:3001";
if (!/^http:\/\/127\.0\.0\.1:3001$/.test(origin))
  throw Error("Smoke test restricted to isolated loopback port 3001");
const report: string[] = [];
async function request(
  path: string,
  body?: unknown,
  cookie = "",
  extra: Record<string, string> = {},
) {
  const response = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    status: response.status,
    data,
    cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
  };
}
async function signedUser() {
  const key = generateSecretKey(),
    pubkey = getPublicKey(key);
  const c = await request("/api/auth/challenge", { pubkey });
  assert.equal(c.status, 200);
  const body = { challenge: c.data.challenge };
  const event = finalizeEvent(
    {
      kind: 27235,
      content: "",
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["u", origin + "/api/auth/login"],
        ["method", "POST"],
        ["challenge", body.challenge],
        [
          "payload",
          createHash("sha256").update(JSON.stringify(body)).digest("hex"),
        ],
      ],
    },
    key,
  );
  const header = {
    Authorization:
      "Nostr " + Buffer.from(JSON.stringify(event)).toString("base64"),
  };
  const r = await request("/api/auth/login", body, "", header);
  assert.equal(r.status, 200);
  assert.ok(r.cookie);
  assert.equal(
    (await request("/api/auth/login", body, "", header)).status,
    401,
  );
  return r.cookie;
}
const ready = await request("/health/ready");
assert.equal(ready.status, 200);
assert.equal(ready.data.activeGames, 0);
assert.equal(
  (await request("/api/pool", { id: randomUUID(), control: "blitz" })).status,
  401,
);
const users: string[] = [];
for (let i = 0; i < 11; i++) users.push(await signedUser());
report.push("11 signed NIP-98 logins; replayed challenges rejected");
assert.equal(
  (
    await request(
      "/api/pool",
      { id: randomUUID(), control: "blitz" },
      users[0],
      { Origin: "http://evil.invalid" },
    )
  ).status,
  403,
);
const games: any[] = [];
for (let i = 0; i < 10; i++) {
  const body = {
    id: randomUUID(),
    control: i % 2 ? "rapid" : "blitz",
    color: "white",
  };
  const r = await request("/api/pool", body, users[i]);
  assert.equal(r.status, 200);
  games.push(r.data);
  const retry = await request("/api/pool", body, users[i]);
  assert.equal(retry.data.id, r.data.id);
}
assert.equal(
  (
    await request(
      "/api/pool",
      { id: randomUUID(), control: "blitz" },
      users[10],
    )
  ).status,
  503,
);
report.push(
  "10-game admission cap enforced; pool retries do not duplicate games",
);
assert.equal(
  (await request(`/api/games/${games[0].id}`, undefined, users[1])).status,
  404,
);
const updates: any[] = [];
const ws = new WebSocket(origin.replace("http:", "ws:") + "/api/socket", {
  headers: { Origin: origin, Cookie: users[0] },
});
await new Promise<void>((resolve, reject) => {
  ws.on("open", () => resolve());
  ws.on("error", reject);
});
ws.on("message", (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === "state") updates.push(m.game);
});
ws.send(JSON.stringify({ type: "subscribe", gameId: games[0].id }));
const commands = games.map((g) => ({
  id: randomUUID(),
  version: 0,
  type: "move",
  uci: "e2e4",
}));
const moved = await Promise.all(
  games.map((g, i) =>
    request(`/api/games/${g.id}/commands`, commands[i], users[i]),
  ),
);
for (const r of moved) assert.equal(r.status, 200);
assert.equal(
  (await request(`/api/games/${games[0].id}/commands`, commands[0], users[0]))
    .data.version,
  1,
);
assert.equal(
  (
    await request(
      `/api/games/${games[0].id}/commands`,
      { ...commands[0], uci: "d2d4" },
      users[0],
    )
  ).status,
  409,
);
assert.equal(
  (
    await request(
      `/api/games/${games[0].id}/commands`,
      { id: randomUUID(), version: 0, type: "resign" },
      users[0],
    )
  ).status,
  409,
);
const deadline = Date.now() + 10_000;
while (Date.now() < deadline) {
  const results = await Promise.all(
    games.map((g, i) => request(`/api/games/${g.id}`, undefined, users[i])),
  );
  results.forEach((r, i) => (games[i] = r.data));
  if (games.every((g) => g.version === 2)) break;
  await new Promise((r) => setTimeout(r, 200));
}
assert.ok(games.every((g) => g.version === 2));
assert.ok(games.every((g) => g.moves[0] === "e2e4" && g.moves.length === 2));
assert.ok(updates.some((g) => g.version === 2));
report.push(
  "10 simultaneous scripted human moves receive legal Maia79M replies over real worker IPC; WebSocket update delivered",
);
// Reconnect restores the authoritative state, not a client-supplied board.
ws.close();
const reconnected = await request(
  `/api/games/${games[0].id}`,
  undefined,
  users[0],
);
assert.equal(reconnected.data.version, 2);
assert.ok(reconnected.data.clocks.white < 300_000 + 3000);
const illegal = await request(
  `/api/games/${games[0].id}/commands`,
  { id: randomUUID(), version: 2, type: "move", uci: "e4e7" },
  users[0],
);
assert.equal(illegal.status, 400);
for (let i = 0; i < 10; i++) {
  const command = { id: randomUUID(), version: 2, type: "resign" };
  const r = await request(
    `/api/games/${games[i].id}/commands`,
    command,
    users[i],
  );
  assert.equal(r.status, 200);
  assert.equal(r.data.status, "finished");
  assert.equal(
    (await request(`/api/games/${games[i].id}/commands`, command, users[i]))
      .status,
    200,
  );
}
const pg = await request(`/api/games/${games[0].id}/pgn`, undefined, users[0]);
assert.equal(pg.status, 200);
assert.match(pg.data, /MaiaModelSHA256/);
assert.match(pg.data, /1\. e4/);
assert.match(pg.data, /0-1/);
report.push(
  "Illegal/stale/altered-retry commands rejected; ownership protected; resignation retry idempotent; PGN includes policy metadata",
);
assert.equal((await request("/health/ready")).data.activeGames, 0);
await request("/api/auth/logout", {}, users[0]);
assert.equal((await request("/api/me", undefined, users[0])).data.user, null);
report.push("Logout revokes session");
console.log(JSON.stringify({ passed: true, checks: report }, null, 2));

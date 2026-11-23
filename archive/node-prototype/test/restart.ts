/** Destructive-to-test-instance recovery check. Never targets the development service. */
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} from "nostr-tools/pure";
import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:3001";
const file = ".scratch/recovery-fixture.json";
async function req(
  path: string,
  body?: unknown,
  cookie = "",
  headers: Record<string, string> = {},
) {
  const r = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  assert.equal(r.status, 200, JSON.stringify(data));
  return { data, cookie: r.headers.get("set-cookie")?.split(";")[0] ?? "" };
}
if (process.argv[2] === "prepare") {
  const key = generateSecretKey();
  const c = await req("/api/auth/challenge", { pubkey: getPublicKey(key) });
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
  const auth = await req("/api/auth/login", body, "", {
    Authorization:
      "Nostr " + Buffer.from(JSON.stringify(event)).toString("base64"),
  });
  const game = await req(
    "/api/pool",
    { id: randomUUID(), control: "blitz", color: "white" },
    auth.cookie,
  );
  await fs.mkdir(".scratch", { recursive: true });
  await fs.writeFile(
    file,
    JSON.stringify({ id: game.data.id, cookie: auth.cookie }),
    { mode: 0o600 },
  );
  console.log(
    "Prepared active test game; identity/session remain in private local fixture",
  );
} else if (process.argv[2] === "check") {
  const f = JSON.parse(await fs.readFile(file, "utf8"));
  const r = await req("/api/games/" + f.id, undefined, f.cookie);
  assert.equal(r.data.status, "void");
  assert.equal(r.data.reason, "service_restart");
  assert.equal(r.data.result, "*");
  assert.equal(r.data.rated, false);
  assert.equal((await req("/health/ready")).data.activeGames, 0);
  await fs.rm(file);
  console.log(
    "PASS: restart preserved login/history and voided unfinished game without a fabricated result",
  );
} else throw Error("Use prepare or check");

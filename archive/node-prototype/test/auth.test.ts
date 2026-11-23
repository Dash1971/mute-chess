import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSecretKey, finalizeEvent } from "nostr-tools/pure";
import { verifyLogin, digest } from "../src/auth.js";
import { origin } from "../src/config.js";
const secret = generateSecretKey(),
  token = "1".repeat(64),
  body = JSON.stringify({ challenge: token });
function sign(tags: string[][], at = Math.floor(Date.now() / 1000)) {
  const e = finalizeEvent(
    { kind: 27235, content: "", created_at: at, tags },
    secret,
  );
  return "Nostr " + Buffer.from(JSON.stringify(e)).toString("base64");
}
const tags = () => [
  ["u", `${origin}/api/auth/login`],
  ["method", "POST"],
  ["challenge", token],
  ["payload", digest(body)],
];
test("verifies signed URL/method/body/challenge binding", () => {
  assert.match(verifyLogin(sign(tags()), body, token), /^[a-f0-9]{64}$/);
  assert.throws(() => verifyLogin(sign(tags()), body + " ", token));
  const t = tags();
  t[0]![1] = origin + "/wrong";
  assert.throws(() => verifyLogin(sign(t), body, token));
  assert.throws(() =>
    verifyLogin(sign([...tags(), ["challenge", token]]), body, token),
  );
});
test("rejects stale signatures, altered signatures and unsigned payloads", () => {
  assert.throws(() =>
    verifyLogin(sign(tags(), Math.floor(Date.now() / 1000) - 90), body, token),
  );
  assert.throws(() => verifyLogin(undefined, body, token));
  const auth = sign(tags());
  const event = JSON.parse(Buffer.from(auth.slice(6), "base64").toString());
  event.sig = "0".repeat(128);
  assert.throws(() =>
    verifyLogin(
      "Nostr " + Buffer.from(JSON.stringify(event)).toString("base64"),
      body,
      token,
    ),
  );
});

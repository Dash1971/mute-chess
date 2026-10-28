import { createHash, randomBytes, randomUUID } from "node:crypto";
import { verifyEvent } from "nostr-tools/pure";
import { z } from "zod";
import { db, transaction } from "./db.js";
import { origin } from "./config.js";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (code: number, message: string): never => {
  throw new HttpError(code, message);
};
const Event = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  pubkey: z.string().regex(/^[a-f0-9]{64}$/),
  sig: z.string().regex(/^[a-f0-9]{128}$/),
  kind: z.literal(27235),
  content: z.literal(""),
  created_at: z.number().int(),
  tags: z.array(z.array(z.string()).max(3)).max(8),
});
export function verifyLogin(
  authorization: string | undefined,
  body: string,
  expectedToken: string,
  now = Date.now(),
) {
  try {
    if (!authorization?.startsWith("Nostr ") || authorization.length > 8000)
      return fail(401, "Signed authentication required");
    const event = Event.parse(
      JSON.parse(Buffer.from(authorization.slice(6), "base64").toString()),
    );
    const tag = (name: string) => {
      const tags = event.tags.filter((t) => t[0] === name);
      if (tags.length !== 1 || tags[0]!.length !== 2)
        fail(401, "Invalid authentication tags");
      return tags[0]![1];
    };
    if (
      Math.abs(now / 1000 - event.created_at) > 60 ||
      tag("u") !== `${origin}/api/auth/login` ||
      tag("method") !== "POST" ||
      tag("challenge") !== expectedToken ||
      tag("payload") !== digest(body) ||
      !verifyEvent(event)
    )
      return fail(401, "Invalid or expired signature");
    return event.pubkey;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    return fail(401, "Invalid signed authentication");
  }
}
export async function challenge(pubkey: string) {
  const token = randomBytes(32).toString("hex");
  await db.query("DELETE FROM challenges WHERE expires_at < now()");
  await db.query(
    `INSERT INTO challenges VALUES ($1,$2,now()+interval '60 seconds')`,
    [token, pubkey],
  );
  return {
    challenge: token,
    expiresIn: 60,
    url: `${origin}/api/auth/login`,
    method: "POST",
    payloadRequired: true,
  };
}
export async function login(
  authorization: string | undefined,
  rawBody: string,
) {
  const body = z
    .object({ challenge: z.string().regex(/^[a-f0-9]{64}$/) })
    .strict()
    .parse(JSON.parse(rawBody));
  const pubkey = verifyLogin(authorization, rawBody, body.challenge);
  return transaction(async (c) => {
    const used = await c.query(
      "DELETE FROM challenges WHERE token=$1 AND pubkey=$2 AND expires_at>now() RETURNING token",
      [body.challenge, pubkey],
    );
    if (!used.rowCount) fail(401, "Challenge expired or already used");
    const username = `player-${pubkey.slice(0, 16)}`;
    const user = (
      await c.query(
        "INSERT INTO users(id,pubkey,username) VALUES ($1,$2,$3) ON CONFLICT(pubkey) DO UPDATE SET pubkey=EXCLUDED.pubkey RETURNING id,username,pubkey",
        [randomUUID(), pubkey, username],
      )
    ).rows[0];
    const token = randomBytes(32).toString("hex");
    await c.query(
      `INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')`,
      [digest(token), user.id],
    );
    return { user, token };
  });
}
export type User = { id: string; username: string; pubkey: string };
export async function session(
  token: string | undefined,
): Promise<User | undefined> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  return (
    await db.query(
      "SELECT u.id,u.username,u.pubkey FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
      [digest(token)],
    )
  ).rows[0];
}

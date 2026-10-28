import Fastify from "fastify";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import staticFiles from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import { z, ZodError } from "zod";
import type { WebSocket } from "ws";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config, origin, root } from "./config.js";
import { db, migrate } from "./db.js";
import {
  challenge,
  login,
  session,
  digest,
  fail,
  HttpError,
  type User,
} from "./auth.js";
import { Maia } from "./maia.js";
import { Games, Command, pgn, type Game } from "./games.js";
import { bots } from "./policies.js";
declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
    user?: User;
  }
}
const app = Fastify({
  bodyLimit: 16_384,
  logger: {
    level: config.LOG_LEVEL,
    redact: [
      "req.headers.cookie",
      "req.headers.authorization",
      "res.headers.set-cookie",
    ],
  },
  trustProxy: false,
  requestTimeout: 10_000,
});
let stopping = false;
const fatal = (e: Error) => {
  if (stopping) return;
  app.log.error(
    { err: e },
    "Service failure; restarting will void unfinished games",
  );
  if (!stopping) {
    stopping = true;
    setTimeout(() => process.exit(1), 100).unref();
  }
};
const maia = new Maia(fatal);
const games = new Games(maia);
games.on("fatal", fatal);
await migrate();
// Dedicated session lock enforces exactly one clock-owning application process.
const owner = await db.connect();
if (
  !(await owner.query("SELECT pg_try_advisory_lock(867531024) AS owned"))
    .rows[0].owned
)
  throw Error("Another game server owns the clocks");
owner.on("error", fatal);
await maia.ready;
await games.start();
await app.register(cookie);
await app.register(rateLimit, {
  max: 180,
  timeWindow: "1 minute",
  hook: "preHandler",
  keyGenerator: (req) => req.user?.id ?? req.ip,
});
await app.register(websocket, { options: { maxPayload: 2048 } });
app.removeContentTypeParser("application/json");
app.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (req, body, done) => {
    try {
      req.rawBody = String(body);
      done(null, JSON.parse(String(body)));
    } catch {
      done(new HttpError(400, "Invalid JSON"), undefined);
    }
  },
);
app.addHook("onRequest", async (req) => {
  if (
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.headers.origin !== origin
  )
    fail(403, "Origin mismatch");
  if (req.url.startsWith("/api/"))
    req.user = await session(req.cookies.session);
});
app.addHook("onSend", async (_req, reply, payload) => {
  reply
    .header("X-Content-Type-Options", "nosniff")
    .header("Referrer-Policy", "no-referrer")
    .header("Cache-Control", "no-store");
  reply.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  return payload;
});
app.setErrorHandler((e, req, reply) => {
  if (e instanceof ZodError)
    return reply.code(400).send({
      error: "Invalid request",
      issues: e.issues.map((x) => ({ path: x.path, message: x.message })),
    });
  const code =
    e instanceof HttpError
      ? e.statusCode
      : (e as { statusCode?: number }).statusCode;
  if (code && code >= 400 && code < 500)
    return reply
      .code(code)
      .send({ error: e instanceof Error ? e.message : "Request failed" });
  if (code === 503)
    return reply
      .code(503)
      .send({ error: e instanceof Error ? e.message : "Request failed" });
  app.log.error({ err: e, path: req.routeOptions.url }, "Request failed");
  reply.code(503).send({ error: "Service temporarily unavailable" });
  fatal(e instanceof Error ? e : Error("Unknown error"));
});
function requireUser(req: { user?: User }): User {
  if (!req.user) return fail(401, "Sign in first");
  return req.user;
}
const uuid = z.uuid();
app.get("/health/live", async () => ({ ok: true }));
app.get("/health/ready", async (_req, reply) => {
  await db.query("SELECT 1");
  if (!maia.healthy) return reply.code(503).send({ ok: false });
  return {
    ok: true,
    model: "Maia3-79M",
    activeGames: games.active.size,
    capacity: config.MAX_GAMES,
    queuedInference: maia.pending.size,
    rated: false,
  };
});
app.get("/api/me", async (req) => ({
  user: req.user ?? null,
  mode: "private-unrated-alpha",
}));
app.post(
  "/api/auth/challenge",
  { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
  async (req) => {
    const body = z
      .object({ pubkey: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(req.body);
    return challenge(body.pubkey);
  },
);
app.post(
  "/api/auth/login",
  { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
  async (req, reply) => {
    const r = await login(req.headers.authorization, req.rawBody ?? "");
    reply.setCookie("session", r.token, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: origin.startsWith("https:"),
      maxAge: 604800,
    });
    return { user: r.user };
  },
);
const connections = new Set<{
  socket: WebSocket;
  user: User;
  token: string;
  subscribed?: string;
  alive: boolean;
}>();
app.post("/api/auth/logout", async (req, reply) => {
  if (req.cookies.session) {
    await db.query("DELETE FROM sessions WHERE token_hash=$1", [
      digest(req.cookies.session),
    ]);
    for (const c of connections)
      if (c.token === req.cookies.session) c.socket.close(1008, "Signed out");
  }
  reply.clearCookie("session", { path: "/" });
  return { ok: true };
});
app.get("/api/bots", async () => ({ bots }));
app.get("/api/games", async (req) => {
  const user = requireUser(req);
  return {
    games: (
      await db.query(
        "SELECT state FROM games WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 50",
        [user.id],
      )
    ).rows.map((r) => games.snapshot(r.state)),
  };
});
app.post("/api/pool", async (req) => {
  const user = requireUser(req);
  const body = z
    .object({
      id: uuid,
      control: z.enum(["blitz", "rapid"]),
      botId: z.string().max(64).optional(),
      color: z.enum(["white", "black"]).optional(),
    })
    .strict()
    .parse(req.body);
  return games.join(user, body);
});
app.get<{ Params: { id: string } }>("/api/games/:id", async (req) =>
  games.get(uuid.parse(req.params.id), requireUser(req).id),
);
app.post<{ Params: { id: string } }>("/api/games/:id/commands", async (req) =>
  games.command(
    uuid.parse(req.params.id),
    requireUser(req).id,
    Command.parse(req.body),
  ),
);
app.get<{ Params: { id: string } }>(
  "/api/games/:id/pgn",
  async (req, reply) => {
    const g = await games.get(uuid.parse(req.params.id), requireUser(req).id);
    return reply
      .type("application/x-chess-pgn")
      .header("Content-Disposition", `attachment; filename="${g.id}.pgn"`)
      .send(pgn(g));
  },
);
app.get(
  "/api/socket",
  {
    websocket: true,
    preValidation: async (req) => {
      if (req.headers.origin !== origin) fail(403, "Origin mismatch");
      const user = requireUser(req);
      if ([...connections].filter((c) => c.user.id === user.id).length >= 4)
        fail(429, "Too many connections");
    },
  },
  (socket, req) => {
    const user = requireUser(req);
    const connection = {
      socket,
      user,
      token: req.cookies.session!,
      alive: true,
    } as typeof connections extends Set<infer T> ? T : never;
    connections.add(connection);
    let windowStart = Date.now(),
      messages = 0;
    let chain = Promise.resolve();
    const send = (data: unknown) => {
      if (socket.readyState === 1) {
        if (socket.bufferedAmount > 65536) {
          socket.close(1013, "Slow connection");
          return;
        }
        socket.send(JSON.stringify(data));
      }
    };
    socket.on("pong", () => {
      connection.alive = true;
    });
    socket.on("close", () => connections.delete(connection));
    socket.on("message", (raw) => {
      if (Date.now() - windowStart > 60_000) {
        messages = 0;
        windowStart = Date.now();
      }
      if (++messages > 90) {
        socket.close(1008, "Message limit exceeded");
        return;
      }
      chain = chain
        .then(async () => {
          if (!(await session(connection.token))) {
            socket.close(1008, "Session expired");
            return;
          }
          const message = z
            .discriminatedUnion("type", [
              z.object({ type: z.literal("subscribe"), gameId: uuid }).strict(),
              z
                .object({
                  type: z.literal("command"),
                  gameId: uuid,
                  command: Command,
                })
                .strict(),
              z.object({ type: z.literal("ping") }).strict(),
            ])
            .parse(JSON.parse(raw.toString()));
          if (message.type === "ping") {
            send({ type: "pong", serverTime: Date.now() });
            return;
          }
          if (message.type === "subscribe") {
            const game = await games.get(message.gameId, user.id);
            connection.subscribed = game.id;
            send({ type: "state", game });
          } else
            send({
              type: "state",
              game: await games.command(
                message.gameId,
                user.id,
                message.command,
              ),
            });
        })
        .catch((e) => {
          if (
            e instanceof ZodError ||
            e instanceof SyntaxError ||
            e instanceof HttpError
          )
            send({
              type: "error",
              error: e.message,
              status: e instanceof HttpError ? e.statusCode : 400,
            });
          else fatal(e instanceof Error ? e : Error("Socket failure"));
        });
    });
    send({ type: "connected", serverTime: Date.now() });
  },
);
games.on("game", (game: Game) => {
  for (const c of connections)
    if (
      c.user.id === game.userId &&
      c.subscribed === game.id &&
      c.socket.readyState === 1
    ) {
      if (c.socket.bufferedAmount > 65536)
        c.socket.close(1013, "Slow connection");
      else c.socket.send(JSON.stringify({ type: "state", game }));
    }
});
const heartbeat = setInterval(() => {
  for (const c of connections) {
    if (!c.alive) {
      c.socket.terminate();
      continue;
    }
    c.alive = false;
    c.socket.ping();
    void session(c.token)
      .then((u) => {
        if (!u) c.socket.close(1008, "Session expired");
      })
      .catch(fatal);
  }
}, 15_000);
app.get("/source.tar.gz", async (_req, reply) =>
  reply
    .type("application/gzip")
    .send(await readFile(path.join(root, "source.tar.gz"))),
);
// The development server starts at the game page; homepage design proceeds separately.
app.get("/", async (_req, reply) => reply.redirect("/alpha.html"));
await app.register(staticFiles, { root: path.join(root, "public") });
await app.listen({ host: "127.0.0.1", port: config.PORT });
async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(heartbeat);
  games.close();
  for (const c of connections)
    c.socket.close(1001, "Service restarting; reconnect shortly");
  await app.close();
  maia.close();
  owner.release();
  await db.end();
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());

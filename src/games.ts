import { randomInt, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { EventEmitter } from "node:events";
import { z } from "zod";
import { db, transaction } from "./db.js";
import { config } from "./config.js";
import { digest, fail } from "./auth.js";
import { bots, controls, type Bot } from "./policies.js";
import { play, replay, repetitionCount, viewPosition } from "./chess.js";
import type { Maia } from "./maia.js";
export type Game = {
  id: string;
  userId: string;
  username: string;
  bot: Bot;
  humanColor: "white" | "black";
  control: keyof typeof controls;
  status: "active" | "finished" | "void";
  reason: string | null;
  result: "*" | "1-0" | "0-1" | "1/2-1/2";
  moves: string[];
  sans: string[];
  version: number;
  clocks: { white: number; black: number };
  createdAt: string;
  rated: false;
  policy: Bot["policy"];
};
export const Command = z.discriminatedUnion("type", [
  z
    .object({
      id: z.uuid(),
      version: z.number().int().nonnegative(),
      type: z.literal("move"),
      uci: z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/),
    })
    .strict(),
  z
    .object({
      id: z.uuid(),
      version: z.number().int().nonnegative(),
      type: z.enum(["resign", "claim_draw"]),
    })
    .strict(),
]);
type Command = z.infer<typeof Command>;
export class Games extends EventEmitter {
  active = new Map<string, { g: Game; anchor: number; botPending: boolean }>();
  locks = new Map<string, Promise<unknown>>();
  tickTimer?: NodeJS.Timeout;
  constructor(public maia: Pick<Maia, "predict" | "healthy">) {
    super();
  }
  async serial<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(fn);
    this.locks.set(key, current);
    try {
      return await current;
    } finally {
      if (this.locks.get(key) === current) this.locks.delete(key);
    }
  }
  async start() {
    // Clocks cannot be reconstructed reliably after a process outage: void honestly.
    await transaction(async (c) => {
      const rows = await c.query(
        "SELECT state FROM games WHERE status='active' FOR UPDATE",
      );
      for (const row of rows.rows) {
        const g: Game = row.state;
        g.status = "void";
        g.reason = "service_restart";
        g.result = "*";
        g.version++;
        await c.query(
          "UPDATE games SET status=$2,state=$3,updated_at=now() WHERE id=$1",
          [g.id, g.status, g],
        );
        await c.query(
          "INSERT INTO game_events(game_id,version,state) VALUES($1,$2,$3)",
          [g.id, g.version, g],
        );
      }
    });
    this.tickTimer = setInterval(() => {
      for (const id of this.active.keys())
        void this.serial(id, async () => {
          const live = this.active.get(id);
          if (live && this.expire(live)) await this.save(live);
        }).catch((e) => this.emit("fatal", e));
    }, 100);
  }
  close() {
    clearInterval(this.tickTimer);
  }
  snapshot(g: Game) {
    const live = this.active.get(g.id);
    const clocks = { ...g.clocks };
    if (live && g.status === "active") {
      const turn = replay(g.moves).turn;
      clocks[turn] = Math.max(
        0,
        clocks[turn] - (performance.now() - live.anchor),
      );
    }
    return {
      ...g,
      clocks,
      ...viewPosition(g.moves),
      serverTime: Date.now(),
      rated: false as const,
    };
  }
  expire(live: { g: Game; anchor: number }) {
    const g = live.g;
    if (g.status !== "active") return false;
    const turn = replay(g.moves).turn,
      elapsed = performance.now() - live.anchor;
    if (elapsed < g.clocks[turn]) return false;
    g.clocks[turn] = 0;
    g.status = "finished";
    g.version++;
    const winner = turn === "white" ? "black" : "white";
    // Do not award a timeout win to a side lacking mating material.
    const draw = replay(g.moves).hasInsufficientMaterial(winner);
    g.result = draw ? "1/2-1/2" : winner === "white" ? "1-0" : "0-1";
    g.reason = draw ? "timeout_insufficient_material" : "timeout";
    return true;
  }
  async save(
    live: { g: Game; anchor: number },
    receipt?: { command: Command; hash: string },
  ) {
    const g = live.g;
    await transaction(async (c) => {
      await c.query(
        "UPDATE games SET state=$2,status=$3,updated_at=now() WHERE id=$1",
        [g.id, g, g.status],
      );
      await c.query(
        "INSERT INTO game_events(game_id,version,state) VALUES($1,$2,$3)",
        [g.id, g.version, g],
      );
      if (receipt)
        await c.query("INSERT INTO game_commands VALUES($1,$2,$3,$4)", [
          g.id,
          receipt.command.id,
          receipt.hash,
          this.snapshot(g),
        ]);
    });
    if (g.status !== "active") this.active.delete(g.id);
    this.emit("game", this.snapshot(g));
  }
  async get(id: string, userId: string) {
    const g: Game | undefined =
      this.active.get(id)?.g ??
      (
        await db.query("SELECT state FROM games WHERE id=$1 AND user_id=$2", [
          id,
          userId,
        ])
      ).rows[0]?.state;
    if (!g || g.userId !== userId) return fail(404, "Game not found");
    return this.snapshot(g);
  }
  async join(
    user: { id: string; username: string },
    body: {
      id: string;
      control: keyof typeof controls;
      botId?: string;
      color?: "white" | "black";
    },
  ) {
    return this.serial("pool", async () => {
      const hash = digest(JSON.stringify(body));
      const prior = (
        await db.query(
          "SELECT payload_hash,game_id FROM pool_commands WHERE user_id=$1 AND command_id=$2",
          [user.id, body.id],
        )
      ).rows[0];
      if (prior) {
        if (prior.payload_hash !== hash)
          fail(409, "Command ID reused with different content");
        return this.get(prior.game_id, user.id);
      }
      const existing = [...this.active.values()].find(
        (x) => x.g.userId === user.id,
      );
      if (existing) return fail(409, "Finish your current game first");
      if (!this.maia.healthy || this.active.size >= config.MAX_GAMES)
        return fail(503, "The club is at capacity; try again shortly");
      const bot = body.botId ? bots.find((b) => b.id === body.botId) : bots[8];
      if (!bot) return fail(400, "Unknown bot");
      const g: Game = {
        id: randomUUID(),
        userId: user.id,
        username: user.username,
        bot,
        policy: structuredClone(bot.policy),
        humanColor: body.color ?? (randomInt(2) ? "white" : "black"),
        control: body.control,
        status: "active",
        reason: null,
        result: "*",
        moves: [],
        sans: [],
        version: 0,
        clocks: {
          white: controls[body.control].initialMs,
          black: controls[body.control].initialMs,
        },
        createdAt: new Date().toISOString(),
        rated: false,
      };
      await transaction(async (c) => {
        await c.query(
          "INSERT INTO games(id,user_id,status,state) VALUES($1,$2,$3,$4)",
          [g.id, user.id, g.status, g],
        );
        await c.query("INSERT INTO game_events VALUES($1,0,$2,now())", [
          g.id,
          g,
        ]);
        await c.query("INSERT INTO pool_commands VALUES($1,$2,$3,$4)", [
          user.id,
          body.id,
          hash,
          g.id,
        ]);
      });
      const live = { g, anchor: performance.now(), botPending: false };
      this.active.set(g.id, live);
      this.queueBot(g.id);
      return this.snapshot(g);
    });
  }
  async command(id: string, userId: string, command: Command) {
    return this.serial(id, async () => {
      // Check ownership before receipts; a guessed ID must never reveal another game.
      await this.get(id, userId);
      const hash = digest(JSON.stringify(command));
      const prior = (
        await db.query(
          "SELECT payload_hash,response FROM game_commands WHERE game_id=$1 AND command_id=$2",
          [id, command.id],
        )
      ).rows[0];
      if (prior) {
        if (prior.payload_hash !== hash)
          fail(409, "Command ID reused with different content");
        return prior.response;
      }
      const live = this.active.get(id);
      if (!live) return fail(409, "Game already ended");
      const g = live.g;
      if (this.expire(live)) {
        await this.save(live);
        return fail(409, "Clock expired");
      }
      if (command.version !== g.version)
        return fail(409, "Game changed; reconnect to resynchronize");
      if (command.type === "resign") {
        const turn = replay(g.moves).turn;
        const now = performance.now();
        g.clocks[turn] = Math.max(0, g.clocks[turn] - (now - live.anchor));
        live.anchor = now;
        g.status = "finished";
        g.reason = "resignation";
        g.result = g.humanColor === "white" ? "0-1" : "1-0";
        g.version++;
      } else if (command.type === "claim_draw") {
        if (replay(g.moves).turn !== g.humanColor)
          fail(409, "Wait for your turn");
        if (repetitionCount(g.moves) < 3 && replay(g.moves).halfmoves < 100)
          fail(400, "No claimable draw in this position");
        const turn = replay(g.moves).turn;
        const now = performance.now();
        g.clocks[turn] = Math.max(0, g.clocks[turn] - (now - live.anchor));
        live.anchor = now;
        g.status = "finished";
        g.reason = "claimed_draw";
        g.result = "1/2-1/2";
        g.version++;
      } else if (command.type === "move") {
        if (replay(g.moves).turn !== g.humanColor)
          fail(409, "Wait for your turn");
        if (!play(g.moves, command.uci)) fail(400, "Illegal move");
        this.apply(live, command.uci);
      }
      await this.save(live, { command, hash });
      this.queueBot(id);
      return this.snapshot(g);
    });
  }
  apply(live: { g: Game; anchor: number }, uci: string) {
    const g = live.g;
    const pos = replay(g.moves);
    const result = play(g.moves, uci);
    if (!result) throw Error("Illegal engine move");
    const now = performance.now();
    // Validation can cross a clock boundary. Never grant an increment to a late move.
    if (now - live.anchor >= g.clocks[pos.turn]) {
      this.expire(live);
      return;
    }
    g.clocks[pos.turn] =
      g.clocks[pos.turn] - (now - live.anchor) +
      controls[g.control].incrementMs;
    live.anchor = now;
    g.moves.push(result.uci);
    g.sans.push(result.san);
    g.version++;
    if (result.outcome) {
      g.status = "finished";
      g.reason = result.outcome.winner
        ? "checkmate"
        : "stalemate_or_insufficient_material";
      g.result =
        result.outcome.winner === "white"
          ? "1-0"
          : result.outcome.winner === "black"
            ? "0-1"
            : "1/2-1/2";
    } else if (
      replay(g.moves).halfmoves >= 150 ||
      repetitionCount(g.moves) >= 5
    ) {
      g.status = "finished";
      g.reason = "automatic_draw";
      g.result = "1/2-1/2";
    }
  }
  queueBot(id: string) {
    const live = this.active.get(id);
    if (
      !live ||
      live.botPending ||
      replay(live.g.moves).turn === live.g.humanColor
    )
      return;
    live.botPending = true;
    const version = live.g.version;
    const target =
      performance.now() +
      randomInt(live.g.policy.timing.minMs, live.g.policy.timing.maxMs + 1);
    // Inference and queue time count toward the bot clock; no clock is paused.
    void (async () => {
      try {
        const prediction = await this.maia.predict(
          [...live.g.moves],
          live.g.policy,
        );
        const remaining = Math.max(0, target - performance.now());
        if (remaining) await new Promise((r) => setTimeout(r, remaining));
        await this.serial(id, async () => {
          const current = this.active.get(id);
          if (!current || current.g.version !== version) return;
          if (this.expire(current)) {
            await this.save(current);
            return;
          }
          // Bots claim an available draw rather than endlessly repeat.
          const pos = replay(current.g.moves);
          if (pos.halfmoves >= 100 || repetitionCount(current.g.moves) >= 3) {
            current.g.status = "finished";
            current.g.result = "1/2-1/2";
            current.g.reason = "claimed_draw";
            current.g.version++;
          } else this.apply(current, prediction.move);
          current.botPending = false;
          await this.save(current);
        });
      } catch (e) {
        await this.serial(id, async () => {
          const current = this.active.get(id);
          if (!current) return;
          current.g.status = "void";
          current.g.result = "*";
          current.g.reason = "inference_service_failure";
          current.g.version++;
          await this.save(current);
        }).catch((error) => this.emit("fatal", error));
      }
    })();
  }
}
export function pgn(g: Game) {
  const escape = (s: string) =>
    s.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const tags = {
    Event: "Mute Chess private technical alpha — unrated",
    Site: "Mute Chess",
    Date: g.createdAt.slice(0, 10).replaceAll("-", "."),
    White: g.humanColor === "white" ? g.username : g.bot.name,
    Black: g.humanColor === "black" ? g.username : g.bot.name,
    Result: g.result,
    TimeControl: `${controls[g.control].initialMs / 1000}+${controls[g.control].incrementMs / 1000}`,
    Termination: g.reason ?? "unterminated",
    MaiaPolicy: g.policy.version,
    MaiaModelSHA256: g.policy.modelSha256,
    MaiaEncoder: g.policy.encoderRevision,
    MaiaSampling: g.policy.samplingAlgorithm,
    MaiaHistory: String(g.policy.history),
    MaiaSelfElo: String(g.policy.selfElo),
    MaiaOpponentElo: String(g.policy.opponentElo),
    MaiaTemperature: String(g.policy.temperature),
    MaiaTopP: String(g.policy.topP),
  };
  const moves = g.sans
    .map((san, i) => `${i % 2 === 0 ? `${i / 2 + 1}. ` : ""}${san}`)
    .join(" ");
  return (
    Object.entries(tags)
      .map(([k, v]) => `[${k} "${escape(v)}"]`)
      .join("\n") +
    "\n\n" +
    moves +
    " " +
    g.result +
    "\n"
  );
}

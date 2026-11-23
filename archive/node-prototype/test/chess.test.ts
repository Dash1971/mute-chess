import { test } from "node:test";
import assert from "node:assert/strict";
import { play, replay, repetitionCount, viewPosition } from "../src/chess.js";
import { Games, type Game } from "../src/games.js";
import { bots } from "../src/policies.js";
import { performance } from "node:perf_hooks";

test("rejects illegal moves and check exposure; detects mate", () => {
  assert.equal(play([], "e2e5"), undefined);
  assert.equal(play([], "e7e5"), undefined);
  const moves = ["f2f3", "e7e5", "g2g4"];
  const result = play(moves, "d8h4");
  assert.equal(result?.san, "Qh4#");
  assert.equal(result?.outcome?.winner, "black");
  assert.equal(play([...moves, "d8h4"], "a2a3"), undefined);
});
test("castling, en passant and repetition use actual rules", () => {
  const opening = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"];
  assert.equal(play(opening, "e1g1")?.san, "O-O");
  const ep = ["e2e4", "a7a6", "e4e5", "d7d5"];
  assert.equal(play(ep, "e5d6")?.san, "exd6");
  const cycle = ["g1f3", "g8f6", "f3g1", "f6g8"];
  assert.equal(repetitionCount([...cycle, ...cycle]), 3);
  assert.equal(viewPosition([]).turn, "white");
  assert.equal(replay(["e2e4"]).turn, "black");
});
function fixture(): Game {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    username: "test",
    bot: bots[8]!,
    policy: bots[8]!.policy,
    humanColor: "white",
    control: "blitz",
    status: "active",
    reason: null,
    result: "*",
    moves: [],
    sans: [],
    version: 0,
    clocks: { white: 1000, black: 1000 },
    createdAt: new Date().toISOString(),
    rated: false,
  };
}
test("clock consumes elapsed time, adds increment and switches turns", () => {
  const games = new Games({
    healthy: true,
    predict: async () => {
      throw Error("unused");
    },
  });
  const g = fixture();
  const live = { g, anchor: performance.now() - 200 };
  games.apply(live, "e2e4");
  assert.ok(g.clocks.white > 3700 && g.clocks.white <= 3800);
  assert.equal(g.version, 1);
  assert.equal(replay(g.moves).turn, "black");
  live.anchor = performance.now() - 1100;
  assert.equal(games.expire(live), true);
  assert.equal(g.reason, "timeout");
  assert.equal(g.result, "1-0");
});


test("a move arriving after flag fall cannot earn an increment", () => {
  const games = new Games({ healthy: true, predict: async () => { throw Error("unused"); } });
  const g = fixture();
  g.clocks.white = 1;
  const live = { g, anchor: performance.now() - 5 };
  games.apply(live, "e2e4");
  assert.equal(g.moves.length, 0);
  assert.equal(g.clocks.white, 0);
  assert.equal(g.result, "0-1");
  assert.equal(g.reason, "timeout");
  assert.equal(g.version, 1);
});

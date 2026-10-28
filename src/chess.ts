import { Chess } from "chessops/chess";
import { makeFen } from "chessops/fen";
import { parseUci, makeUci } from "chessops/util";
import { makeSanAndPlay } from "chessops/san";
import { chessgroundDests } from "chessops/compat";
export function replay(moves: string[]) {
  const pos = Chess.default();
  for (const uci of moves) {
    const m = parseUci(uci);
    if (!m || !pos.isLegal(m)) throw Error("Illegal saved move");
    pos.play(m);
  }
  return pos;
}
export function play(moves: string[], uci: string) {
  const pos = replay(moves);
  const move = parseUci(uci);
  if (!move || !pos.isLegal(move)) return;
  const san = makeSanAndPlay(pos, move);
  return {
    san,
    uci: makeUci(move),
    fen: makeFen(pos.toSetup()),
    outcome: pos.outcome(),
  };
}
export function repetitionKey(pos: Chess) {
  return makeFen(pos.toSetup()).split(" ").slice(0, 4).join(" ");
}
export function repetitionCount(moves: string[]) {
  const p = Chess.default(),
    counts = new Map<string, number>();
  const add = () => {
    const key = repetitionKey(p);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  add();
  for (const uci of moves) {
    p.play(parseUci(uci)!);
    add();
  }
  return counts.get(repetitionKey(p))!;
}
export function viewPosition(moves: string[]) {
  const pos = replay(moves);
  return {
    fen: makeFen(pos.toSetup()),
    turn: pos.turn,
    dests: Object.fromEntries(chessgroundDests(pos)),
    check: pos.isCheck(),
  };
}

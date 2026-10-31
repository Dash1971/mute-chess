// Native snapshots must extend the observed game, never rewind or change its prefix.
export class StudyProgress {
  observed = new Map();
  acknowledged = new Map();
  observe(game) {
    const moves = game.state.moves ? game.state.moves.split(' ') : [];
    if (moves.length !== game.ply) throw Error('Native move history/ply disagreement');
    const before = this.observed.get(game.id) ?? [];
    if (moves.length < before.length || before.some((move, ply) => moves[ply] !== move))
      throw Error(`Native history rollback or conflicting prefix: ${game.id}`);
    const ack = this.acknowledged.get(game.id);
    if (ack && ((moves.length > ack.ply && moves[ack.ply] !== ack.move) ||
        (moves.length <= ack.ply && Date.now() - ack.at > 10000)))
      throw Error(`Native state lost an acknowledged move: ${game.id}`);
    this.observed.set(game.id, moves);
    return moves;
  }
  maySubmit(game) {
    this.observe(game);
    // A GET can race a pending acknowledgement. Skip that old snapshot; never
    // submit an already acknowledged ply. The next GET must advance normally.
    return game.ply > (this.acknowledged.get(game.id)?.ply ?? -1);
  }
  acknowledge(game, move) {
    if (game.ply <= (this.acknowledged.get(game.id)?.ply ?? -1)) throw Error('Duplicate acknowledged study ply');
    this.observe(game);
    this.acknowledged.set(game.id, { ply: game.ply, move, at: Date.now() });
  }
}

// One shared ordinary worker, with at most its two supported requests running.
// Human turns get two of every three contested slots, with FIFO within each
// class. Waiting for a clock delay does not occupy an inference slot.
export class PredictionDeferred extends Error {
  constructor(message, code) {
    super(message);
    // The adapter already treats native stale-ply conflicts as neutral retries.
    this.status = 409;
    this.code = code;
  }
}
export class PredictionQueue {
  constructor(worker, maximumWaiting = 10) {
    this.worker = worker;
    this.maximumWaiting = maximumWaiting;
    this.waiting = [];
    this.running = 0;
    this.closed = false;
    this.humanStreak = 0;
    this.currentTurns = null;
  }
  synchronize(games) {
    this.currentTurns = new Map(games.filter(game => game.botToMove).map(game => [game.id, game.ply]));
    this.waiting = this.waiting.filter(job => {
      if (this.isCurrent(job.turn)) return true;
      job.reject(new PredictionDeferred('Obsolete bot turn', 'turn_obsolete'));
      return false;
    });
    this.pump();
  }
  isCurrent(turn) {
    return !turn || this.currentTurns?.get(turn.id) === turn.ply;
  }
  predict(moves, policy, automatic = false, turn) {
    if (this.closed || !this.worker.healthy) return Promise.reject(Error('Maia unavailable'));
    if (!this.isCurrent(turn)) return Promise.reject(new PredictionDeferred('Obsolete bot turn', 'turn_obsolete'));
    if (this.waiting.length >= this.maximumWaiting) return Promise.reject(new PredictionDeferred('Maia queue full', 'queue_busy'));
    return new Promise((resolve, reject) => {
      this.waiting.push({ moves, policy, automatic, turn: turn && { id: turn.id, ply: turn.ply }, resolve, reject });
      this.pump();
    });
  }
  pump() {
    while (!this.closed && this.running < 2 && this.waiting.length) {
      const human = this.waiting.findIndex(job => !job.automatic);
      const automatic = this.waiting.findIndex(job => job.automatic);
      const index = human >= 0 && (this.humanStreak < 2 || automatic < 0) ? human : automatic;
      const job = this.waiting.splice(index, 1)[0];
      this.humanStreak = job.automatic ? 0 : Math.min(2, this.humanStreak + 1);
      this.running++;
      Promise.resolve().then(() => {
        if (!this.isCurrent(job.turn)) throw new PredictionDeferred('Obsolete bot turn', 'turn_obsolete');
        return this.worker.predict(job.moves, job.policy);
      })
        .then(result => {
          if (!this.isCurrent(job.turn)) throw new PredictionDeferred('Obsolete bot turn', 'turn_obsolete');
          return result;
        })
        .then(job.resolve, job.reject).finally(() => { this.running--; this.pump(); });
    }
  }
  close() {
    this.closed = true;
    for (const job of this.waiting.splice(0)) job.reject(Error('Maia unavailable'));
  }
}

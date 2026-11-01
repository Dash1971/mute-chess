// One shared ordinary worker, with at most its two supported requests running.
// Human turns get two of every three contested slots, with FIFO within each
// class. Waiting for a clock delay does not occupy an inference slot.
export class PredictionQueue {
  constructor(worker, maximumWaiting = 10) {
    this.worker = worker;
    this.maximumWaiting = maximumWaiting;
    this.waiting = [];
    this.running = 0;
    this.closed = false;
    this.humanStreak = 0;
  }
  predict(moves, policy, automatic = false) {
    if (this.closed || !this.worker.healthy) return Promise.reject(Error('Maia unavailable'));
    if (this.waiting.length >= this.maximumWaiting) return Promise.reject(Error('Maia queue full'));
    return new Promise((resolve, reject) => {
      this.waiting.push({ moves, policy, automatic, resolve, reject });
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
      Promise.resolve().then(() => this.worker.predict(job.moves, job.policy))
        .then(job.resolve, job.reject).finally(() => { this.running--; this.pump(); });
    }
  }
  close() {
    this.closed = true;
    for (const job of this.waiting.splice(0)) job.reject(Error('Maia unavailable'));
  }
}

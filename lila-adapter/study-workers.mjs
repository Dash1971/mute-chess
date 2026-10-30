// A bounded pool for the study only; the production human-game adapter is unchanged.
export class StudyWorkers {
  constructor(count, createWorker) {
    if (![1, 2].includes(count)) throw Error('Study supports one or two workers');
    this.workers = Array.from({ length: count }, createWorker);
    this.maxPending = count * 2;
    this.ready = Promise.all(this.workers.map(worker => worker.ready));
    this.cursor = 0;
  }
  predict(moves, policy) {
    if (!this.workers.every(worker => worker.healthy)) return Promise.reject(Error('Study worker unavailable'));
    const available = this.workers.filter(worker => worker.pending.size < 2);
    if (!available.length) return Promise.reject(Error('Study workers full'));
    const minimum = Math.min(...available.map(worker => worker.pending.size));
    const leastBusy = available.filter(worker => worker.pending.size === minimum);
    const worker = leastBusy[this.cursor++ % leastBusy.length];
    return worker.predict(moves, policy).then(result => ({ ...result, studyWorker: this.workers.indexOf(worker) }));
  }
  close() { for (const worker of this.workers) worker.close(); }
}

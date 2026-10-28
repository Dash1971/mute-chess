import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';

export const MODEL_SHA256 = '3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010';
export class Maia {
  healthy = false;
  pending = new Map();
  constructor(python, worker, model) {
    this.child = spawn(python, [worker], { env: { ...process.env, MAIA_MODEL: model,
      PYTHONDONTWRITEBYTECODE: '1', OMP_NUM_THREADS: '2', OPENBLAS_NUM_THREADS: '1' } });
    this.child.stderr.on('data', data => process.stderr.write(data));
    this.ready = new Promise((resolve, reject) => {
      const deadline = setTimeout(() => { reject(Error('Maia startup timeout')); this.child.kill(); }, 60000);
      this.child.once('error', reject);
      this.child.once('exit', () => { clearTimeout(deadline); reject(Error('Maia exited')); });
      createInterface({ input: this.child.stdout }).on('line', line => {
        try {
          const result = JSON.parse(line);
          if (result.ready) {
            if (result.modelSha256 !== MODEL_SHA256) throw Error('Model mismatch');
            this.healthy = true; clearTimeout(deadline); resolve(); return;
          }
          const pending = this.pending.get(result.id);
          if (!pending) return;
          this.pending.delete(result.id); clearTimeout(pending.deadline);
          if (result.error || typeof result.move !== 'string' || result.modelSha256 !== MODEL_SHA256)
            pending.reject(Error('Maia inference failed'));
          else pending.resolve(result);
        } catch { this.child.kill(); }
      });
    });
    this.child.once('exit', () => {
      this.healthy = false;
      for (const pending of this.pending.values()) { clearTimeout(pending.deadline); pending.reject(Error('Maia unavailable')); }
      this.pending.clear();
    });
  }
  predict(moves, policy) {
    if (!this.healthy || this.pending.size >= 2) return Promise.reject(Error('Maia unavailable or full'));
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => { this.pending.delete(id); reject(Error('Maia deadline')); this.child.kill(); }, 8000);
      this.pending.set(id, { resolve, reject, deadline });
      this.child.stdin.write(JSON.stringify({ id, moves, ...policy }) + '\n', error => {
        if (error) { clearTimeout(deadline); this.pending.delete(id); reject(error); }
      });
    });
  }
  close() { this.child.kill(); }
}

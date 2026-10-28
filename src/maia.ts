import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { config, root } from "./config.js";
import { MODEL_SHA256, type Bot } from "./policies.js";
import path from "node:path";
export type Prediction = {
  move: string;
  inferenceMs: number;
  modelSha256: string;
};
export class Maia {
  child: ChildProcessWithoutNullStreams;
  healthy = false;
  pending = new Map<
    string,
    {
      resolve: (r: Prediction) => void;
      reject: (e: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  ready: Promise<void>;
  constructor(onFatal: (e: Error) => void) {
    this.child = spawn(
      config.MAIA_PYTHON,
      [path.join(root, "worker/maia_worker.py")],
      {
        env: {
          ...process.env,
          PYTHONDONTWRITEBYTECODE: "1",
          OMP_NUM_THREADS: "2",
          OPENBLAS_NUM_THREADS: "1",
        },
      },
    );
    this.child.stderr.on("data", (d) => process.stderr.write(d));
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(Error("Maia startup timeout"));
        this.child.kill();
      }, 60_000);
      this.child.once("error", reject);
      this.child.once("exit", () => {
        clearTimeout(timer);
        reject(Error("Maia exited"));
      });
      createInterface({ input: this.child.stdout }).on("line", (line) => {
        try {
          const r = JSON.parse(line);
          if (r.ready) {
            if (r.modelSha256 !== MODEL_SHA256) throw Error("Model mismatch");
            this.healthy = true;
            clearTimeout(timer);
            resolve();
            return;
          }
          const job = this.pending.get(r.id);
          if (!job) return;
          this.pending.delete(r.id);
          clearTimeout(job.timer);
          if (
            r.error ||
            typeof r.move !== "string" ||
            r.modelSha256 !== MODEL_SHA256
          )
            job.reject(Error("Maia inference failed"));
          else job.resolve(r);
        } catch (e) {
          this.child.kill();
        }
      });
    });
    this.child.once("exit", () => {
      this.healthy = false;
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(Error("Maia unavailable"));
      }
      this.pending.clear();
      onFatal(Error("Maia worker exited"));
    });
  }
  async predict(moves: string[], policy: Bot["policy"]) {
    if (!this.healthy || this.pending.size >= 10)
      throw Error("Maia unavailable or queue full");
    const id = randomUUID();
    return new Promise<Prediction>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error("Maia deadline exceeded"));
        this.child.kill();
      }, 8000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(
        JSON.stringify({ id, moves, ...policy }) + "\n",
        (e) => {
          if (e) {
            this.pending.delete(id);
            clearTimeout(timer);
            reject(e);
          }
        },
      );
    });
  }
  close() {
    this.child.kill();
  }
}

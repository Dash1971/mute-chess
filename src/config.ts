import path from "node:path";
import { z } from "zod";
export const config = z
  .object({
    PORT: z.coerce.number().int().min(1024).max(65535).default(3000),
    ORIGIN: z.string().url().default("http://127.0.0.1:3000"),
    PGHOST: z.string().default("/var/run/postgresql"),
    PGUSER: z.string().default("clubmaia"),
    PGDATABASE: z.string().default("clubmaia"),
    MAIA_PYTHON: z.string().default(".venv/bin/python"),
    MAIA_MODEL: z.string(),
    MAX_GAMES: z.coerce.number().int().min(1).max(10).default(10),
    LOG_LEVEL: z.string().default("info"),
  })
  .parse(process.env);
export const root = path.resolve(import.meta.dirname, "..");
export const origin = new URL(config.ORIGIN).origin;
if (!["http:", "https:"].includes(new URL(origin).protocol))
  throw Error("HTTP origin required");

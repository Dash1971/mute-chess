import pg from "pg";
import { config } from "./config.js";
export const db = new pg.Pool({
  host: config.PGHOST,
  user: config.PGUSER,
  database: config.PGDATABASE,
  max: 8,
  connectionTimeoutMillis: 5000,
});
export async function transaction<T>(
  fn: (c: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function migrate() {
  await transaction(async (c) => {
    await c.query(`
    CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY, pubkey text UNIQUE NOT NULL CHECK (pubkey ~ '^[a-f0-9]{64}$'), username text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS challenges (token text PRIMARY KEY, pubkey text NOT NULL, expires_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS games (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), status text NOT NULL, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_game_per_user ON games(user_id) WHERE status='active';
    CREATE TABLE IF NOT EXISTS game_events (game_id uuid REFERENCES games(id), version integer NOT NULL, state jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(game_id,version));
    CREATE TABLE IF NOT EXISTS game_commands (game_id uuid REFERENCES games(id), command_id uuid NOT NULL, payload_hash text NOT NULL, response jsonb NOT NULL, PRIMARY KEY(game_id,command_id));
    CREATE TABLE IF NOT EXISTS pool_commands (user_id uuid REFERENCES users(id), command_id uuid NOT NULL, payload_hash text NOT NULL, game_id uuid NOT NULL REFERENCES games(id), PRIMARY KEY(user_id,command_id));
  `);
  });
}

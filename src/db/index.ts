import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Drizzle client backed by Neon's serverless HTTP driver. Works on the Vercel
 * edge + Node runtimes without a persistent connection pool.
 *
 * DATABASE_URL is auto-set by the Vercel Storage → Neon integration; locally,
 * mirror it in `.env.local`.
 */

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it via the Vercel Storage integration (Neon) or paste a Neon connection string into .env.local."
    );
  }
  return drizzle(neon(url), { schema });
}

export async function getDb() {
  if (!_db) _db = getClient();
  return _db;
}

export { schema };
export type DB = Awaited<ReturnType<typeof getDb>>;

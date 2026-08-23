import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { getDb, type Env } from "../config/env";
import { banFingerprintsTable } from "../schema";

export function createBanRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { banFingerprintsTable } });

  return {
    findByHash(hash: string) {
      return db
        .select()
        .from(banFingerprintsTable)
        .where(eq(banFingerprintsTable.hash, hash))
        .get();
    },

    insert(input: { hash: string; bannedBy?: string | null; reason: string }) {
      return db.insert(banFingerprintsTable).values(input).returning().get();
    },

    deleteByHash(hash: string) {
      return db.delete(banFingerprintsTable).where(eq(banFingerprintsTable.hash, hash)).run();
    },
  };
}

import { drizzle } from "drizzle-orm/d1";
import { and, eq, gte, like, lt, sql } from "drizzle-orm";
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

    // D1 caps LIKE patterns at 50 bytes, so long keys use a range / substr.
    findByEmailHash(emailHash: string) {
      return db
        .select()
        .from(banFingerprintsTable)
        .where(
          and(
            gte(banFingerprintsTable.hash, `e:${emailHash}:`),
            lt(banFingerprintsTable.hash, `e:${emailHash};`),
          ),
        )
        .get();
    },

    insert(input: { hash: string; bannedBy?: string | null; reason: string }) {
      return db.insert(banFingerprintsTable).values(input).onConflictDoNothing().returning().get();
    },

    deleteByHash(hash: string) {
      return db.delete(banFingerprintsTable).where(eq(banFingerprintsTable.hash, hash)).run();
    },

    deleteEmailsForFingerprint(fingerprint: string) {
      return db
        .delete(banFingerprintsTable)
        .where(
          and(
            like(banFingerprintsTable.hash, "e:%"),
            sql`substr(${banFingerprintsTable.hash}, -64) = ${fingerprint}`,
          ),
        )
        .run();
    },
  };
}

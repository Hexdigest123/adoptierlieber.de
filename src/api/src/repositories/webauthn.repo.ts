import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { webauthnCredentialsTable } from "../schema";

export type CreateWebauthnInput = {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[] | null;
  deviceType: string | null;
  backedUp: boolean;
  name: string;
};

export function createWebauthnRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { webauthnCredentialsTable } });

  return {
    create(input: CreateWebauthnInput) {
      return db.insert(webauthnCredentialsTable).values(input).returning().get();
    },

    listByUserId(userId: string) {
      return db
        .select()
        .from(webauthnCredentialsTable)
        .where(eq(webauthnCredentialsTable.userId, userId))
        .all();
    },

    countByUserId(userId: string) {
      return db
        .select({ n: count() })
        .from(webauthnCredentialsTable)
        .where(eq(webauthnCredentialsTable.userId, userId))
        .get();
    },

    findById(id: string) {
      return db
        .select()
        .from(webauthnCredentialsTable)
        .where(eq(webauthnCredentialsTable.id, id))
        .get();
    },

    findByCredentialId(credentialId: string) {
      return db
        .select()
        .from(webauthnCredentialsTable)
        .where(eq(webauthnCredentialsTable.credentialId, credentialId))
        .get();
    },

    updateName(id: string, name: string) {
      return db
        .update(webauthnCredentialsTable)
        .set({ name })
        .where(eq(webauthnCredentialsTable.id, id))
        .returning()
        .get();
    },

    updateCounter(id: string, counter: number) {
      return db
        .update(webauthnCredentialsTable)
        .set({ counter, lastUsedAt: new Date() })
        .where(eq(webauthnCredentialsTable.id, id))
        .returning()
        .get();
    },

    delete(id: string) {
      return db
        .delete(webauthnCredentialsTable)
        .where(eq(webauthnCredentialsTable.id, id))
        .returning({ id: webauthnCredentialsTable.id })
        .get();
    },
  };
}

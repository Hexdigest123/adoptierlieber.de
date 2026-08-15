import { drizzle } from "drizzle-orm/d1";
import { sessionsTable } from "../schema";
import type { Env } from "../config/env";
import { eq } from "drizzle-orm";

export function createSessionRepo(env: Env) {
  const db = drizzle(env.adoptierlieber, { schema: { sessionsTable } });

  return {
    create(input: {
      userId: string;
      sessionToken: string;
      expiresAt: Date;
      ipAddress: string | null;
      userAgent: string | null;
    }) {
      return db
        .insert(sessionsTable)
        .values(input)
        .returning({
          userId: sessionsTable.userId,
          token: sessionsTable.sessionToken,
          expiresAt: sessionsTable.expiresAt,
          ipAddress: sessionsTable.ipAddress,
          userAgent: sessionsTable.userAgent,
        })
        .onConflictDoNothing()
        .get();
    },
    find(sessionToken: string) {
      return db
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.sessionToken, sessionToken))
        .get();
    },
    deleteWithToken(sessionToken: string) {
      return db
        .delete(sessionsTable)
        .where(eq(sessionsTable.sessionToken, sessionToken))
        .returning({ id: sessionsTable.id })
        .get();
    },
    deleteAllWithUserId(userId: string) {
      return db
        .delete(sessionsTable)
        .where(eq(sessionsTable.userId, userId))
        .returning({ id: sessionsTable.id })
        .all();
    },
    updateLastUsedWithToken(sessionToken: string) {
      return db
        .update(sessionsTable)
        .set({ lastUsedAt: new Date() })
        .where(eq(sessionsTable.sessionToken, sessionToken))
        .returning({ id: sessionsTable.id })
        .get();
    },
    updateExpiresAtWithToken(sessionToken: string, expiresAt: Date) {
      return db
        .update(sessionsTable)
        .set({ expiresAt })
        .where(eq(sessionsTable.sessionToken, sessionToken))
        .returning({ id: sessionsTable.id })
        .get();
    },
  };
}

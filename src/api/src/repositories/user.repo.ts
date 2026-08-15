import { drizzle } from "drizzle-orm/d1";
import { usersTable } from "../schema";
import type { Env } from "../config/env";
import { eq } from "drizzle-orm";

export function createUserRepo(env: Env) {
  const db = drizzle(env.adoptierlieber, { schema: { usersTable } });

  return {
    list() {
      return db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          displayName: usersTable.displayName,
          email: usersTable.email,
        })
        .from(usersTable)
        .all();
    },
    create(input: { name: string; displayName?: string; email: string; password: string }) {
      return db
        .insert(usersTable)
        .values(input)
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          displayName: usersTable.displayName,
          email: usersTable.email,
        })
        .onConflictDoNothing()
        .get();
    },
    findById(id: string) {
      return db.select().from(usersTable).where(eq(usersTable.id, id)).get();
    },
    findByEmail(email: string) {
      return db.select().from(usersTable).where(eq(usersTable.email, email)).get();
    },
    updateDeletionToken(
      userId: string,
      accountDeletionToken: string,
      accountDeletionTokenExpiresAt: Date,
    ) {
      return db
        .update(usersTable)
        .set({ accountDeletionToken, accountDeletionTokenExpiresAt })
        .where(eq(usersTable.id, userId))
        .returning({
          accountDeletionToken: usersTable.accountDeletionToken,
          accountDeletionTokenExpiresAt: usersTable.accountDeletionTokenExpiresAt,
        })
        .get();
    },

    updateResetToken(
      userId: string,
      passwordResetToken: string,
      passwordResetTokenExpiresAt: Date,
    ) {
      return db
        .update(usersTable)
        .set({ passwordResetToken, passwordResetTokenExpiresAt })
        .where(eq(usersTable.id, userId))
        .returning({
          accountResetToken: usersTable.passwordResetToken,
          accountResetTokenExpiresAt: usersTable.passwordResetTokenExpiresAt,
        })
        .get();
    },

    updatePassword(userId: string, password: string) {
      return db
        .update(usersTable)
        .set({ password: password })
        .where(eq(usersTable.id, userId))
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          displayName: usersTable.displayName,
          email: usersTable.email,
        })
        .get();
    },

    delete(id: string) {
      return db.delete(usersTable).where(eq(usersTable.id, id)).run();
    },
  };
}

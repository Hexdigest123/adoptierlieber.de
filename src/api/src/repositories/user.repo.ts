import { drizzle } from "drizzle-orm/d1";
import { usersTable } from "../schema";
import { getDb, type Env } from "../config/env";
import { eq, sql } from "drizzle-orm";
import { PLATFORM_ROLE } from "../lib/roles";

export type CreateUserInput = {
  name: string;
  displayName?: string;
  email: string;
  password: string;
  emailVerificationToken?: string | null;
  emailVerificationTokenExpiresAt?: Date | null;
  avatarKey?: string | null;
  platformRole?: number;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export function createUserRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { usersTable } });

  return {
    list() {
      return db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          displayName: usersTable.displayName,
          email: usersTable.email,
          avatarKey: usersTable.avatarKey,
        })
        .from(usersTable)
        .all();
    },

    hasSuperAdmin() {
      return db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.platformRole, PLATFORM_ROLE.SUPER_ADMIN))
        .get();
    },

    create(input: CreateUserInput) {
      return db
        .insert(usersTable)
        .values({
          ...input,
          platformRole: input.platformRole ?? PLATFORM_ROLE.USER,
        })
        .returning()
        .get();
    },

    findById(id: string) {
      return db.select().from(usersTable).where(eq(usersTable.id, id)).get();
    },

    findByEmail(email: string) {
      return db
        .select()
        .from(usersTable)
        .where(sql`lower(${usersTable.email}) = ${email.toLowerCase()}`)
        .get();
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
        .set({ password: password, passwordChangedAt: new Date() })
        .where(eq(usersTable.id, userId))
        .returning()
        .get();
    },

    updateProfile(
      userId: string,
      values: {
        name?: string;
        displayName?: string | null;
        street?: string;
        zip?: string;
        city?: string;
        lat?: number | null;
        lng?: number | null;
        homeQuery?: string | null;
        homeLabel?: string | null;
        homeCountry?: string | null;
        homeLat?: number | null;
        homeLng?: number | null;
        locationPrecision?: "place" | "gps" | null;
        maxRangeKm?: number | null;
        preferences?: Record<string, unknown> | null;
        tasteWeights?: Record<string, number> | null;
      },
    ) {
      return db.update(usersTable).set(values).where(eq(usersTable.id, userId)).returning().get();
    },

    updateAvatarKey(userId: string, avatarKey: string | null) {
      return db
        .update(usersTable)
        .set({ avatarKey })
        .where(eq(usersTable.id, userId))
        .returning({
          id: usersTable.id,
          avatarKey: usersTable.avatarKey,
        })
        .get();
    },

    updatePlatformRole(userId: string, platformRole: number) {
      return db
        .update(usersTable)
        .set({ platformRole })
        .where(eq(usersTable.id, userId))
        .returning()
        .get();
    },

    setSuspendedAt(userId: string, suspendedAt: Date | null) {
      return db
        .update(usersTable)
        .set({ suspendedAt })
        .where(eq(usersTable.id, userId))
        .returning()
        .get();
    },

    delete(id: string) {
      return db.delete(usersTable).where(eq(usersTable.id, id)).run();
    },

    unsetPasswordReset(userId: string) {
      return db
        .update(usersTable)
        .set({ passwordResetToken: null, passwordResetTokenExpiresAt: null })
        .where(eq(usersTable.id, userId))
        .run();
    },

    unsetAccountDeletion(userId: string) {
      return db
        .update(usersTable)
        .set({ accountDeletionToken: null, accountDeletionTokenExpiresAt: null })
        .where(eq(usersTable.id, userId))
        .run();
    },

    verifyEmail(userId: string) {
      return db
        .update(usersTable)
        .set({
          emailVerifiedAt: new Date(),
          emailVerificationToken: null,
          emailVerificationTokenExpiresAt: null,
        })
        .where(eq(usersTable.id, userId))
        .returning({ id: usersTable.id })
        .get();
    },
  };
}

import { drizzle } from "drizzle-orm/d1";
import { usersTable } from "../schema";
import { getDb, type Env } from "../config/env";
import { and, eq, isNull, sql } from "drizzle-orm";
import { PLATFORM_ROLE } from "../lib/roles";

export type CreateUserInput = {
  name: string;
  displayName?: string;
  email: string;
  password: string;
  emailVerificationToken?: string | null;
  emailVerificationTokenExpiresAt?: Date | null;
  emailVerifiedAt?: Date | null;
  passwordChangedAt?: Date;
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

    /** Same password, stronger hash. Not a change: passwordChangedAt gates break-glass. */
    rehashPassword(userId: string, password: string) {
      return db.update(usersTable).set({ password }).where(eq(usersTable.id, userId)).run();
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

    updateTotpPending(userId: string, totpPendingSecret: string | null) {
      return db
        .update(usersTable)
        .set({ totpPendingSecret })
        .where(eq(usersTable.id, userId))
        .returning()
        .get();
    },

    confirmTotp(userId: string, totpSecret: string) {
      return db
        .update(usersTable)
        .set({
          totpSecret,
          totpPendingSecret: null,
          totpConfirmedAt: new Date(),
          totpLastCounter: null,
        })
        .where(eq(usersTable.id, userId))
        .returning()
        .get();
    },

    clearTotp(userId: string) {
      return db
        .update(usersTable)
        .set({
          totpSecret: null,
          totpPendingSecret: null,
          totpConfirmedAt: null,
          totpLastCounter: null,
        })
        .where(eq(usersTable.id, userId))
        .returning()
        .get();
    },

    updateTotpLastCounter(userId: string, totpLastCounter: number) {
      return db
        .update(usersTable)
        .set({ totpLastCounter })
        .where(eq(usersTable.id, userId))
        .returning()
        .get();
    },

    /** Fresh link for an account that is still unverified; a no-op once it is verified. */
    renewVerificationToken(
      userId: string,
      emailVerificationToken: string,
      emailVerificationTokenExpiresAt: Date,
    ) {
      return db
        .update(usersTable)
        .set({ emailVerificationToken, emailVerificationTokenExpiresAt })
        .where(and(eq(usersTable.id, userId), isNull(usersTable.emailVerifiedAt)))
        .returning({ id: usersTable.id })
        .get();
    },

    /** Keeps the token until it expires so a second click on the link still succeeds. */
    verifyEmail(userId: string) {
      return db
        .update(usersTable)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(usersTable.id, userId))
        .returning({ id: usersTable.id })
        .get();
    },
  };
}

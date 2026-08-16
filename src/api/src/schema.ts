import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  displayName: text("display_name"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  passwordResetToken: text("password_reset_token"),
  passwordResetTokenExpiresAt: integer("password_reset_token_expires_at", {
    mode: "timestamp",
  }),
  accountDeletionToken: text("account_deletion_token"),
  accountDeletionTokenExpiresAt: integer("account_deletion_token_expires_at", {
    mode: "timestamp",
  }),
  passwordChangedAt: integer("password_changed_at", {
    mode: "timestamp",
  }).$defaultFn(() => new Date()),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationTokenExpiresAt: integer("email_verification_token_expires_at", {
    mode: "timestamp",
  }),
  emailVerifiedAt: integer("email_verified_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessionsTable = sqliteTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    sessionToken: text("session_token").notNull().unique(),
    userAgent: text("user_agent"),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("user_id_idx").on(table.userId)],
);

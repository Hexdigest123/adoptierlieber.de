import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { SHELTER_ROLE } from "./lib/roles";

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

export const sheltersTable = sqliteTable("shelters", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgName: text("org_name").notNull(),
  street: text("street").notNull(),
  zip: text("zip").notNull(),
  city: text("city").notNull(),
  website: text("website"),
  registrationNumber: text("registration_number"),
  description: text("description"),
  verificationStatus: text("verification_status", {
    enum: ["pending", "verified", "rejected"],
  })
    .notNull()
    .$defaultFn(() => "pending"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const shelterMembersTable = sqliteTable(
  "shelter_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    shelterId: text("shelter_id")
      .references(() => sheltersTable.id, { onDelete: "cascade" })
      .notNull(),
    role: integer("role")
      .notNull()
      .$default(() => SHELTER_ROLE.STAFF), // 0 | 1 | 2
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("shelter_members_user_shelter_uq").on(table.userId, table.shelterId),
    index("shelter_members_shelter_idx").on(table.shelterId),
    index("shelter_members_user_idx").on(table.userId),
  ],
);

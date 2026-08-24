import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex, real } from "drizzle-orm/sqlite-core";
import { PLATFORM_ROLE, SHELTER_ROLE } from "./lib/roles";

export const usersTable = sqliteTable(
  "users",
  {
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
    avatarKey: text("avatar_key"),
    platformRole: integer("platform_role")
      .notNull()
      .$defaultFn(() => PLATFORM_ROLE.USER),
    street: text("street"),
    zip: text("zip"),
    city: text("city"),
    lat: real("lat"),
    lng: real("lng"),
    suspendedAt: integer("suspended_at", { mode: "timestamp" }),
    homeQuery: text("home_query"),
    homeLabel: text("home_label"),
    homeCountry: text("home_country"),
    homeLat: real("home_lat"),
    homeLng: real("home_lng"),
    locationPrecision: text("location_precision", { enum: ["place", "gps"] }),
    maxRangeKm: integer("max_range_km"),
    preferences: text("preferences", { mode: "json" }).$type<Record<string, unknown>>(),
    tasteWeights: text("taste_weights", { mode: "json" }).$type<Record<string, number>>(),
    totpSecret: text("totp_secret"),
    totpPendingSecret: text("totp_pending_secret"),
    totpConfirmedAt: integer("totp_confirmed_at", { mode: "timestamp" }),
    totpLastCounter: integer("totp_last_counter"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("users_super_admin_uq")
      .on(table.platformRole)
      .where(sql`${table.platformRole} = 0`),
    index("users_city_idx").on(table.city),
    index("users_platform_role_idx").on(table.platformRole),
  ],
);

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
    kind: text("kind", { enum: ["full", "setup"] })
      .notNull()
      .default("full"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("user_id_idx").on(table.userId)],
);

export const webauthnCredentialsTable = sqliteTable(
  "webauthn_credentials",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    credentialId: text("credential_id").notNull(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    transports: text("transports", { mode: "json" }).$type<string[]>(),
    deviceType: text("device_type"),
    backedUp: integer("backed_up", { mode: "boolean" }).notNull().default(false),
    name: text("name").notNull(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("webauthn_credentials_user_idx").on(table.userId),
    uniqueIndex("webauthn_credentials_credential_id_uq").on(table.credentialId),
  ],
);

export const sheltersTable = sqliteTable(
  "shelters",
  {
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
    verificationReason: text("verification_reason"),
    verificationDecidedAt: integer("verification_decided_at", { mode: "timestamp" }),
    verificationDecidedBy: text("verification_decided_by"),
    notifyEmail: text("notify_email"),
    notifyLastError: text("notify_last_error"),
    logoKey: text("logo_key"),
    lat: real("lat"),
    lng: real("lng"),
    geocodedAt: integer("geocoded_at", { mode: "timestamp" }),
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    applicationForm: text("application_form", { mode: "json" }).$type<unknown[]>(),
    checklist: text("checklist", { mode: "json" }).$type<Record<string, boolean>>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("shelters_verification_idx").on(table.verificationStatus),
    index("shelters_city_idx").on(table.city),
  ],
);

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
      .$default(() => SHELTER_ROLE.STAFF),
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

export const animalsTable = sqliteTable(
  "animals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    shelterId: text("shelter_id")
      .references(() => sheltersTable.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    species: text("species", {
      enum: ["cat", "dog", "rabbit", "guinea_pig", "bird", "reptile", "other"],
    }).notNull(),
    breed: text("breed"),
    sex: text("sex", { enum: ["male", "female", "unknown"] }),
    ageMonths: integer("age_months"),
    ageUnknown: integer("age_unknown", { mode: "boolean" }).notNull().default(false),
    size: text("size", { enum: ["s", "m", "l", "xl"] }),
    colors: text("colors", { mode: "json" }).$type<string[]>(),
    traits: text("traits", { mode: "json" }).$type<string[]>(),
    tagline: text("tagline"),
    description: text("description"),
    photos: text("photos", { mode: "json" }).$type<string[]>(),
    status: text("status", { enum: ["draft", "live", "found_home"] })
      .notNull()
      .default("draft"),
    vaccinated: text("vaccinated", { enum: ["yes", "no", "unknown"] }),
    neutered: text("neutered", { enum: ["yes", "no", "unknown"] }),
    chipped: text("chipped", { enum: ["yes", "no", "unknown"] }),
    houseTrained: text("house_trained", { enum: ["yes", "no", "unknown"] }),
    bondedPartner: text("bonded_partner"),
    bondedAnimalId: text("bonded_animal_id"),
    bondGroupId: text("bond_group_id"),
    likeCount: integer("like_count").notNull().default(0),
    impressionCount: integer("impression_count").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    foundHomeAt: integer("found_home_at", { mode: "timestamp" }),
    foundHomeNote: text("found_home_note"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("animals_shelter_idx").on(table.shelterId),
    index("animals_status_idx").on(table.status),
    index("animals_shelter_status_idx").on(table.shelterId, table.status),
    index("animals_species_idx").on(table.species),
    index("animals_bond_group_idx").on(table.bondGroupId),
  ],
);

export const banFingerprintsTable = sqliteTable("ban_fingerprints", {
  hash: text("hash").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  bannedBy: text("banned_by"),
  reason: text("reason").notNull(),
});

export const adminInvitesTable = sqliteTable(
  "admin_invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    consumedAt: integer("consumed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("admin_invites_email_idx").on(table.email)],
);

export const adminAuditTable = sqliteTable(
  "admin_audit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    action: text("action").notNull(),
    actorId: text("actor_id"),
    actorName: text("actor_name").notNull(),
    actorEmail: text("actor_email").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    targetLabel: text("target_label").notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("admin_audit_created_idx").on(table.createdAt),
    index("admin_audit_action_created_idx").on(table.action, table.createdAt),
  ],
);

export const applicationNotesTable = sqliteTable(
  "application_notes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    shelterId: text("shelter_id")
      .references(() => sheltersTable.id, { onDelete: "cascade" })
      .notNull(),
    authorId: text("author_id"),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("application_notes_shelter_created_idx").on(table.shelterId, table.createdAt)],
);

export const shelterInvitesTable = sqliteTable(
  "shelter_invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    shelterId: text("shelter_id")
      .references(() => sheltersTable.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    role: integer("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    consumedAt: integer("consumed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("shelter_invites_shelter_idx").on(table.shelterId),
    index("shelter_invites_email_idx").on(table.email),
  ],
);

export const threadsTable = sqliteTable(
  "threads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    shelterId: text("shelter_id")
      .references(() => sheltersTable.id, { onDelete: "cascade" })
      .notNull(),
    animalId: text("animal_id")
      .references(() => animalsTable.id, { onDelete: "cascade" })
      .notNull(),
    adopterUserId: text("adopter_user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    lastMessageAt: integer("last_message_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    unreadForShelter: integer("unread_for_shelter", { mode: "boolean" }).notNull().default(true),
    unreadForAdopter: integer("unread_for_adopter", { mode: "boolean" }).notNull().default(false),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    emailGranted: integer("email_granted", { mode: "boolean" }).notNull().default(false),
    profileGranted: integer("profile_granted", { mode: "boolean" }).notNull().default(false),
    grantedAt: integer("granted_at", { mode: "timestamp" }),
    grantEmail: text("grant_email"),
    grantProfile: text("grant_profile", { mode: "json" }).$type<Record<string, unknown>>(),
    applicationAnswers: text("application_answers", { mode: "json" }).$type<unknown>(),
    assignedUserId: text("assigned_user_id"),
  },
  (table) => [
    uniqueIndex("threads_shelter_animal_adopter_uq").on(
      table.shelterId,
      table.animalId,
      table.adopterUserId,
    ),
    index("threads_shelter_last_idx").on(table.shelterId, table.lastMessageAt),
    index("threads_adopter_idx").on(table.adopterUserId),
    index("threads_animal_idx").on(table.animalId),
    index("threads_assigned_idx").on(table.assignedUserId),
  ],
);

export const messagesTable = sqliteTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: text("thread_id")
      .references(() => threadsTable.id, { onDelete: "cascade" })
      .notNull(),
    authorUserId: text("author_user_id"),
    kind: text("kind", { enum: ["user", "system"] })
      .notNull()
      .default("user"),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("messages_thread_created_idx").on(table.threadId, table.createdAt)],
);

export const animalLikesTable = sqliteTable(
  "animal_likes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    animalId: text("animal_id")
      .references(() => animalsTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("animal_likes_user_animal_uq").on(table.userId, table.animalId),
    index("animal_likes_animal_idx").on(table.animalId),
  ],
);

export const swipeEventsTable = sqliteTable(
  "swipe_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    animalId: text("animal_id")
      .references(() => animalsTable.id, { onDelete: "cascade" })
      .notNull(),
    action: text("action", { enum: ["like", "skip", "undo"] }).notNull(),
    reason: text("reason"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("swipe_events_user_animal_idx").on(table.userId, table.animalId, table.createdAt),
    index("swipe_events_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const animalImpressionsDailyTable = sqliteTable(
  "animal_impressions_daily",
  {
    animalId: text("animal_id")
      .references(() => animalsTable.id, { onDelete: "cascade" })
      .notNull(),
    day: text("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("animal_impressions_daily_uq").on(table.animalId, table.day),
    index("animal_impressions_daily_day_idx").on(table.day),
  ],
);

export const replySnippetsTable = sqliteTable(
  "reply_snippets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    shelterId: text("shelter_id")
      .references(() => sheltersTable.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("reply_snippets_shelter_idx").on(table.shelterId)],
);

export const threadReadsTable = sqliteTable(
  "thread_reads",
  {
    threadId: text("thread_id")
      .references(() => threadsTable.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    lastReadAt: integer("last_read_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("thread_reads_thread_user_uq").on(table.threadId, table.userId),
    index("thread_reads_user_idx").on(table.userId),
  ],
);

export const reviewsTable = sqliteTable(
  "reviews",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    stars: integer("stars").notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ["pending", "approved"] })
      .notNull()
      .$defaultFn(() => "pending"),
    decidedAt: integer("decided_at", { mode: "timestamp" }),
    decidedBy: text("decided_by"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("reviews_user_uq").on(table.userId),
    index("reviews_status_idx").on(table.status),
    index("reviews_created_idx").on(table.createdAt),
    index("reviews_status_created_idx").on(table.status, table.createdAt),
  ],
);

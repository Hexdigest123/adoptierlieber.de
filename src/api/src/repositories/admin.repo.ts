import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { PLATFORM_ROLE, SHELTER_ROLE } from "../lib/roles";
import {
  adminAuditTable,
  adminInvitesTable,
  animalsTable,
  applicationNotesTable,
  banFingerprintsTable,
  shelterMembersTable,
  sheltersTable,
  usersTable,
} from "../schema";

export type AdminListParams = {
  q?: string;
  city?: string;
  status?: string;
  verified?: string;
  verificationStatus?: string;
  species?: string;
  action?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
  offset: number;
  limit: number;
};

const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function likePattern(q: string): string {
  return `%${q.toLowerCase().replace(/[%_]/g, "\\$&")}%`;
}

function auditCutoff(): Date {
  return new Date(Date.now() - AUDIT_RETENTION_MS);
}

function anyOf(...parts: SQL[]): SQL | undefined {
  return or(...parts);
}

export function createAdminRepo(env: Env) {
  const db = drizzle(getDb(env), {
    schema: {
      usersTable,
      sheltersTable,
      shelterMembersTable,
      animalsTable,
      banFingerprintsTable,
      adminInvitesTable,
      adminAuditTable,
      applicationNotesTable,
    },
  });

  return {
    async overview() {
      const [users, suspended, pending, verified, rejected, animals] = await Promise.all([
        db.select({ n: sql<number>`count(*)` }).from(usersTable).get(),
        db
          .select({ n: sql<number>`count(*)` })
          .from(usersTable)
          .where(isNotNull(usersTable.suspendedAt))
          .get(),
        db
          .select({ n: sql<number>`count(*)` })
          .from(sheltersTable)
          .where(eq(sheltersTable.verificationStatus, "pending"))
          .get(),
        db
          .select({ n: sql<number>`count(*)` })
          .from(sheltersTable)
          .where(eq(sheltersTable.verificationStatus, "verified"))
          .get(),
        db
          .select({ n: sql<number>`count(*)` })
          .from(sheltersTable)
          .where(eq(sheltersTable.verificationStatus, "rejected"))
          .get(),
        db.select({ n: sql<number>`count(*)` }).from(animalsTable).get(),
      ]);
      return {
        users: Number(users?.n ?? 0),
        suspended: Number(suspended?.n ?? 0),
        shelters_pending: Number(pending?.n ?? 0),
        shelters_verified: Number(verified?.n ?? 0),
        shelters_rejected: Number(rejected?.n ?? 0),
        animals: Number(animals?.n ?? 0),
        pending_applications: Number(pending?.n ?? 0),
      };
    },

    pendingApplicationCount() {
      return db
        .select({ n: sql<number>`count(*)` })
        .from(sheltersTable)
        .where(eq(sheltersTable.verificationStatus, "pending"))
        .get();
    },

    async listUsers(params: AdminListParams) {
      const filters = [];
      if (params.q) {
        const p = likePattern(params.q);
        const qFilter = anyOf(
          sql`lower(${usersTable.name}) like ${p} escape '\\'`,
          sql`lower(${usersTable.displayName}) like ${p} escape '\\'`,
          sql`lower(${usersTable.email}) like ${p} escape '\\'`,
          sql`lower(${usersTable.city}) like ${p} escape '\\'`,
        );
        if (qFilter) filters.push(qFilter);
      }
      if (params.city) {
        filters.push(sql`lower(${usersTable.city}) = ${params.city.toLowerCase()}`);
      }
      if (params.status === "active") {
        filters.push(isNull(usersTable.suspendedAt));
      } else if (params.status === "suspended") {
        filters.push(isNotNull(usersTable.suspendedAt));
      }
      if (params.verified === "yes") {
        filters.push(isNotNull(usersTable.emailVerifiedAt));
      } else if (params.verified === "no") {
        filters.push(isNull(usersTable.emailVerifiedAt));
      }
      const where = filters.length ? and(...filters) : undefined;

      const [totalRow, items] = await Promise.all([
        db
          .select({ n: sql<number>`count(*)` })
          .from(usersTable)
          .where(where)
          .get(),
        db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            displayName: usersTable.displayName,
            email: usersTable.email,
            avatarKey: usersTable.avatarKey,
            city: usersTable.city,
            platformRole: usersTable.platformRole,
            suspendedAt: usersTable.suspendedAt,
            emailVerifiedAt: usersTable.emailVerifiedAt,
            createdAt: usersTable.createdAt,
          })
          .from(usersTable)
          .where(where)
          .orderBy(desc(usersTable.createdAt))
          .limit(params.limit)
          .offset(params.offset)
          .all(),
      ]);
      return { items, total: Number(totalRow?.n ?? 0) };
    },

    async listShelters(params: AdminListParams) {
      const filters = [];
      if (params.verificationStatus === "pending" || params.verificationStatus === "verified" || params.verificationStatus === "rejected") {
        filters.push(eq(sheltersTable.verificationStatus, params.verificationStatus));
      }
      if (params.city) {
        filters.push(sql`lower(${sheltersTable.city}) = ${params.city.toLowerCase()}`);
      }
      if (params.q) {
        const p = likePattern(params.q);
        const qFilter = anyOf(
          sql`lower(${sheltersTable.orgName}) like ${p} escape '\\'`,
          sql`lower(${sheltersTable.city}) like ${p} escape '\\'`,
          sql`lower(${sheltersTable.registrationNumber}) like ${p} escape '\\'`,
          sql`lower(${usersTable.name}) like ${p} escape '\\'`,
          sql`lower(${usersTable.email}) like ${p} escape '\\'`,
        );
        if (qFilter) filters.push(qFilter);
      }
      const where = filters.length ? and(...filters) : undefined;

      const ownerJoin = and(
        eq(shelterMembersTable.shelterId, sheltersTable.id),
        eq(shelterMembersTable.role, SHELTER_ROLE.OWNER),
      );

      const [totalRow, items] = await Promise.all([
        db
          .select({ n: sql<number>`count(distinct ${sheltersTable.id})` })
          .from(sheltersTable)
          .leftJoin(shelterMembersTable, ownerJoin)
          .leftJoin(usersTable, eq(usersTable.id, shelterMembersTable.userId))
          .where(where)
          .get(),
        db
          .select({
            id: sheltersTable.id,
            orgName: sheltersTable.orgName,
            city: sheltersTable.city,
            zip: sheltersTable.zip,
            street: sheltersTable.street,
            website: sheltersTable.website,
            registrationNumber: sheltersTable.registrationNumber,
            verificationStatus: sheltersTable.verificationStatus,
            createdAt: sheltersTable.createdAt,
            logoKey: sheltersTable.logoKey,
            ownerId: usersTable.id,
            ownerName: usersTable.name,
            ownerEmail: usersTable.email,
          })
          .from(sheltersTable)
          .leftJoin(shelterMembersTable, ownerJoin)
          .leftJoin(usersTable, eq(usersTable.id, shelterMembersTable.userId))
          .where(where)
          .orderBy(desc(sheltersTable.createdAt))
          .limit(params.limit)
          .offset(params.offset)
          .all(),
      ]);
      return { items, total: Number(totalRow?.n ?? 0) };
    },

    async listAnimals(params: AdminListParams) {
      const filters = [];
      if (
        params.species === "cat" ||
        params.species === "dog" ||
        params.species === "rabbit" ||
        params.species === "guinea_pig" ||
        params.species === "bird" ||
        params.species === "reptile" ||
        params.species === "other"
      ) {
        filters.push(eq(animalsTable.species, params.species));
      }
      if (params.status === "draft" || params.status === "live" || params.status === "found_home") {
        filters.push(eq(animalsTable.status, params.status));
      }
      if (params.q) {
        const p = likePattern(params.q);
        const qFilter = anyOf(
          sql`lower(${animalsTable.name}) like ${p} escape '\\'`,
          sql`lower(${animalsTable.species}) like ${p} escape '\\'`,
          sql`lower(${sheltersTable.orgName}) like ${p} escape '\\'`,
        );
        if (qFilter) filters.push(qFilter);
      }
      const where = filters.length ? and(...filters) : undefined;

      const [totalRow, items] = await Promise.all([
        db
          .select({ n: sql<number>`count(*)` })
          .from(animalsTable)
          .innerJoin(sheltersTable, eq(sheltersTable.id, animalsTable.shelterId))
          .where(where)
          .get(),
        db
          .select({
            id: animalsTable.id,
            name: animalsTable.name,
            species: animalsTable.species,
            status: animalsTable.status,
            createdAt: animalsTable.createdAt,
            photos: animalsTable.photos,
            ageMonths: animalsTable.ageMonths,
            ageUnknown: animalsTable.ageUnknown,
            tagline: animalsTable.tagline,
            traits: animalsTable.traits,
            shelterId: sheltersTable.id,
            shelterName: sheltersTable.orgName,
            city: sheltersTable.city,
          })
          .from(animalsTable)
          .innerJoin(sheltersTable, eq(sheltersTable.id, animalsTable.shelterId))
          .where(where)
          .orderBy(desc(animalsTable.createdAt))
          .limit(params.limit)
          .offset(params.offset)
          .all(),
      ]);
      return { items, total: Number(totalRow?.n ?? 0) };
    },

    findAnimalWithShelter(id: string) {
      return db
        .select({
          animal: animalsTable,
          shelterId: sheltersTable.id,
          shelterName: sheltersTable.orgName,
          city: sheltersTable.city,
        })
        .from(animalsTable)
        .innerJoin(sheltersTable, eq(sheltersTable.id, animalsTable.shelterId))
        .where(eq(animalsTable.id, id))
        .get();
    },

    countAnimalsByShelter(shelterId: string) {
      return db
        .select({ n: sql<number>`count(*)` })
        .from(animalsTable)
        .where(eq(animalsTable.shelterId, shelterId))
        .get();
    },

    listAnimalsByShelter(shelterId: string) {
      return db
        .select({
          id: animalsTable.id,
          name: animalsTable.name,
          species: animalsTable.species,
          status: animalsTable.status,
          photos: animalsTable.photos,
          ageMonths: animalsTable.ageMonths,
          ageUnknown: animalsTable.ageUnknown,
          tagline: animalsTable.tagline,
          traits: animalsTable.traits,
        })
        .from(animalsTable)
        .where(eq(animalsTable.shelterId, shelterId))
        .orderBy(desc(animalsTable.createdAt))
        .all();
    },

    async listBans(params: AdminListParams) {
      const filters = [];
      if (params.q) {
        const p = likePattern(params.q);
        filters.push(sql`lower(${banFingerprintsTable.reason}) like ${p} escape '\\'`);
      }
      const where = filters.length ? and(...filters) : undefined;
      const [totalRow, items] = await Promise.all([
        db
          .select({ n: sql<number>`count(*)` })
          .from(banFingerprintsTable)
          .where(where)
          .get(),
        db
          .select()
          .from(banFingerprintsTable)
          .where(where)
          .orderBy(desc(banFingerprintsTable.createdAt))
          .limit(params.limit)
          .offset(params.offset)
          .all(),
      ]);
      return { items, total: Number(totalRow?.n ?? 0) };
    },

    namesByIds(ids: string[]) {
      if (ids.length === 0) return Promise.resolve([]);
      return db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(inArray(usersTable.id, ids))
        .all();
    },

    async listAudit(params: AdminListParams) {
      const cutoff = auditCutoff();
      const from = params.from && params.from > cutoff ? params.from : cutoff;
      const to = params.to && params.to < new Date() ? params.to : new Date();
      const filters = [gte(adminAuditTable.createdAt, from), lte(adminAuditTable.createdAt, to)];
      if (params.action) {
        filters.push(eq(adminAuditTable.action, params.action));
      }
      if (params.actorId) {
        filters.push(eq(adminAuditTable.actorId, params.actorId));
      }
      if (params.q) {
        const p = likePattern(params.q);
        const qFilter = anyOf(
          sql`lower(${adminAuditTable.actorName}) like ${p} escape '\\'`,
          sql`lower(${adminAuditTable.actorEmail}) like ${p} escape '\\'`,
          sql`lower(${adminAuditTable.targetLabel}) like ${p} escape '\\'`,
          sql`lower(${adminAuditTable.reason}) like ${p} escape '\\'`,
        );
        if (qFilter) filters.push(qFilter);
      }
      const where = and(...filters);
      const [totalRow, items] = await Promise.all([
        db
          .select({ n: sql<number>`count(*)` })
          .from(adminAuditTable)
          .where(where)
          .get(),
        db
          .select()
          .from(adminAuditTable)
          .where(where)
          .orderBy(desc(adminAuditTable.createdAt))
          .limit(params.limit)
          .offset(params.offset)
          .all(),
      ]);
      return { items, total: Number(totalRow?.n ?? 0) };
    },

    listAdmins() {
      return db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          platformRole: usersTable.platformRole,
          emailVerifiedAt: usersTable.emailVerifiedAt,
          createdAt: usersTable.createdAt,
          avatarKey: usersTable.avatarKey,
        })
        .from(usersTable)
        .where(lte(usersTable.platformRole, PLATFORM_ROLE.ADMIN))
        .orderBy(usersTable.platformRole, usersTable.createdAt)
        .all();
    },

    listPendingInvites() {
      return db
        .select()
        .from(adminInvitesTable)
        .where(isNull(adminInvitesTable.consumedAt))
        .orderBy(desc(adminInvitesTable.createdAt))
        .all();
    },

    findInviteById(id: string) {
      return db.select().from(adminInvitesTable).where(eq(adminInvitesTable.id, id)).get();
    },

    findInviteByEmail(email: string) {
      return db
        .select()
        .from(adminInvitesTable)
        .where(
          and(
            sql`lower(${adminInvitesTable.email}) = ${email.toLowerCase()}`,
            isNull(adminInvitesTable.consumedAt),
          ),
        )
        .get();
    },

    findInviteByTokenHash(tokenHash: string) {
      return db
        .select()
        .from(adminInvitesTable)
        .where(eq(adminInvitesTable.tokenHash, tokenHash))
        .get();
    },

    insertInvite(input: {
      email: string;
      tokenHash: string;
      invitedBy: string;
      expiresAt: Date;
    }) {
      return db.insert(adminInvitesTable).values(input).returning().get();
    },

    rotateInvite(id: string, tokenHash: string, expiresAt: Date) {
      return db
        .update(adminInvitesTable)
        .set({ tokenHash, expiresAt, createdAt: new Date() })
        .where(eq(adminInvitesTable.id, id))
        .returning()
        .get();
    },

    consumeInvite(id: string) {
      return db
        .update(adminInvitesTable)
        .set({ consumedAt: new Date() })
        .where(and(eq(adminInvitesTable.id, id), isNull(adminInvitesTable.consumedAt)))
        .returning()
        .get();
    },

    deleteInvite(id: string) {
      return db.delete(adminInvitesTable).where(eq(adminInvitesTable.id, id)).run();
    },

    insertAudit(input: {
      action: string;
      actorId: string | null;
      actorName: string;
      actorEmail: string;
      targetType: string;
      targetId: string | null;
      targetLabel: string;
      reason?: string | null;
    }) {
      return db.insert(adminAuditTable).values(input).run();
    },

    listNotes(shelterId: string) {
      return db
        .select()
        .from(applicationNotesTable)
        .where(eq(applicationNotesTable.shelterId, shelterId))
        .orderBy(applicationNotesTable.createdAt)
        .all();
    },

    insertNote(input: { shelterId: string; authorId: string | null; authorName: string; body: string }) {
      return db.insert(applicationNotesTable).values(input).returning().get();
    },

    wipeNotes(shelterId: string) {
      return db
        .delete(applicationNotesTable)
        .where(eq(applicationNotesTable.shelterId, shelterId))
        .run();
    },

    recentAudit(limit = 8) {
      return db
        .select()
        .from(adminAuditTable)
        .where(gte(adminAuditTable.createdAt, auditCutoff()))
        .orderBy(desc(adminAuditTable.createdAt))
        .limit(limit)
        .all();
    },
  };
}

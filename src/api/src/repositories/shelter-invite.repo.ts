import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { shelterInvitesTable } from "../schema";

export function createShelterInviteRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { shelterInvitesTable } });

  return {
    create(input: {
      shelterId: string;
      email: string;
      role: number;
      tokenHash: string;
      invitedBy: string | null;
      expiresAt: Date;
    }) {
      return db.insert(shelterInvitesTable).values(input).returning().get();
    },

    findByTokenHash(tokenHash: string) {
      return db
        .select()
        .from(shelterInvitesTable)
        .where(eq(shelterInvitesTable.tokenHash, tokenHash))
        .get();
    },

    listByShelter(shelterId: string) {
      return db
        .select()
        .from(shelterInvitesTable)
        .where(eq(shelterInvitesTable.shelterId, shelterId))
        .all();
    },

    findPending(shelterId: string, email: string) {
      return db
        .select()
        .from(shelterInvitesTable)
        .where(
          and(
            eq(shelterInvitesTable.shelterId, shelterId),
            eq(shelterInvitesTable.email, email),
            isNull(shelterInvitesTable.consumedAt),
          ),
        )
        .get();
    },

    consume(id: string) {
      return db
        .update(shelterInvitesTable)
        .set({ consumedAt: new Date() })
        .where(eq(shelterInvitesTable.id, id))
        .returning()
        .get();
    },

    /** Unaccepted, unexpired invites of a shelter. */
    async countOpen(shelterId: string, now: Date) {
      const row = await db
        .select({ n: sql<number>`count(*)` })
        .from(shelterInvitesTable)
        .where(
          and(
            eq(shelterInvitesTable.shelterId, shelterId),
            isNull(shelterInvitesTable.consumedAt),
            gt(shelterInvitesTable.expiresAt, now),
          ),
        )
        .get();
      return Number(row?.n ?? 0);
    },

    /** New token for a fresh mail; createdAt marks when it was last sent. */
    reissue(id: string, tokenHash: string, role: number, expiresAt: Date) {
      return db
        .update(shelterInvitesTable)
        .set({ tokenHash, role, expiresAt, consumedAt: null, createdAt: new Date() })
        .where(eq(shelterInvitesTable.id, id))
        .returning()
        .get();
    },

    /** Keep the mailed token valid, only push the expiry (and role). */
    extend(id: string, role: number, expiresAt: Date) {
      return db
        .update(shelterInvitesTable)
        .set({ role, expiresAt })
        .where(eq(shelterInvitesTable.id, id))
        .returning()
        .get();
    },
  };
}

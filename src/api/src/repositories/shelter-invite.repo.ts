import { and, eq, isNull } from "drizzle-orm";
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

    listPendingByEmail(email: string) {
      return db
        .select()
        .from(shelterInvitesTable)
        .where(and(eq(shelterInvitesTable.email, email), isNull(shelterInvitesTable.consumedAt)))
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

    refresh(id: string, tokenHash: string, expiresAt: Date) {
      return db
        .update(shelterInvitesTable)
        .set({ tokenHash, expiresAt, consumedAt: null })
        .where(eq(shelterInvitesTable.id, id))
        .returning()
        .get();
    },
  };
}

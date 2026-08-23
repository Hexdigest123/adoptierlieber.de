import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { animalsTable, threadsTable, usersTable } from "../schema";
import type { ApplicationAnswer, GrantProfile } from "../types";

export type ThreadWrite = {
  shelterId: string;
  animalId: string;
  adopterUserId: string;
  emailGranted: boolean;
  profileGranted: boolean;
  grantedAt: Date;
  grantEmail: string | null;
  grantProfile: GrantProfile | null;
  applicationAnswers: ApplicationAnswer[] | null;
  unreadForShelter: boolean;
  unreadForAdopter: boolean;
};

export function createThreadRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { threadsTable, animalsTable, usersTable } });

  return {
    create(input: ThreadWrite) {
      return db.insert(threadsTable).values(input).returning().get();
    },

    findById(id: string) {
      return db.select().from(threadsTable).where(eq(threadsTable.id, id)).get();
    },

    findByAnimalAdopter(animalId: string, adopterUserId: string) {
      return db
        .select()
        .from(threadsTable)
        .where(
          and(eq(threadsTable.animalId, animalId), eq(threadsTable.adopterUserId, adopterUserId)),
        )
        .get();
    },

    listByShelter(shelterId: string, opts?: { archived?: boolean }) {
      const where =
        opts?.archived === undefined
          ? eq(threadsTable.shelterId, shelterId)
          : and(eq(threadsTable.shelterId, shelterId), eq(threadsTable.archived, opts.archived));
      return db
        .select()
        .from(threadsTable)
        .where(where)
        .orderBy(desc(threadsTable.lastMessageAt))
        .all();
    },

    listByAdopter(userId: string) {
      return db
        .select()
        .from(threadsTable)
        .where(eq(threadsTable.adopterUserId, userId))
        .orderBy(desc(threadsTable.lastMessageAt))
        .all();
    },

    listByShelterAdopter(shelterId: string, adopterUserId: string) {
      return db
        .select()
        .from(threadsTable)
        .where(
          and(eq(threadsTable.shelterId, shelterId), eq(threadsTable.adopterUserId, adopterUserId)),
        )
        .orderBy(desc(threadsTable.lastMessageAt))
        .all();
    },

    countUnreadForShelter(shelterId: string) {
      return db
        .select({ n: sql<number>`count(*)` })
        .from(threadsTable)
        .where(
          and(
            eq(threadsTable.shelterId, shelterId),
            eq(threadsTable.unreadForShelter, true),
            eq(threadsTable.archived, false),
          ),
        )
        .get();
    },

    countCreatedSince(shelterId: string, since: Date) {
      return db
        .select({ n: sql<number>`count(*)` })
        .from(threadsTable)
        .where(and(eq(threadsTable.shelterId, shelterId), gte(threadsTable.createdAt, since)))
        .get();
    },

    listUnansweredSince(shelterId: string, since: Date) {
      return db
        .select()
        .from(threadsTable)
        .where(
          and(
            eq(threadsTable.shelterId, shelterId),
            eq(threadsTable.unreadForShelter, true),
            eq(threadsTable.archived, false),
            sql`${threadsTable.lastMessageAt} < ${since.getTime()}`,
          ),
        )
        .orderBy(threadsTable.lastMessageAt)
        .all();
    },

    countUnansweredSince(shelterId: string, since: Date) {
      return db
        .select({ n: sql<number>`count(*)` })
        .from(threadsTable)
        .where(
          and(
            eq(threadsTable.shelterId, shelterId),
            eq(threadsTable.unreadForShelter, true),
            eq(threadsTable.archived, false),
            sql`${threadsTable.lastMessageAt} < ${since.getTime()}`,
          ),
        )
        .get();
    },

    countByAnimalIds(animalIds: string[]) {
      if (animalIds.length === 0) return Promise.resolve([] as { animalId: string; n: number }[]);
      return db
        .select({ animalId: threadsTable.animalId, n: sql<number>`count(*)` })
        .from(threadsTable)
        .where(inArray(threadsTable.animalId, animalIds))
        .groupBy(threadsTable.animalId)
        .all();
    },

    countUnreadByAnimalIds(animalIds: string[]) {
      if (animalIds.length === 0) return Promise.resolve([] as { animalId: string; n: number }[]);
      return db
        .select({ animalId: threadsTable.animalId, n: sql<number>`count(*)` })
        .from(threadsTable)
        .where(
          and(inArray(threadsTable.animalId, animalIds), eq(threadsTable.unreadForShelter, true)),
        )
        .groupBy(threadsTable.animalId)
        .all();
    },

    update(
      id: string,
      values: {
        lastMessageAt?: Date;
        unreadForShelter?: boolean;
        unreadForAdopter?: boolean;
        archived?: boolean;
        assignedUserId?: string | null;
      },
    ) {
      return db.update(threadsTable).set(values).where(eq(threadsTable.id, id)).returning().get();
    },
  };
}

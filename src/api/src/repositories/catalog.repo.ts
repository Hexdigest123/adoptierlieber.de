import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import {
  animalImpressionsDailyTable,
  animalLikesTable,
  animalsTable,
  sheltersTable,
  swipeEventsTable,
} from "../schema";
import type { Animal, Shelter } from "../types";

export type AnimalWithShelter = {
  animal: Animal;
  shelter: Shelter;
};

export function createCatalogRepo(env: Env) {
  const db = drizzle(getDb(env), {
    schema: {
      animalsTable,
      sheltersTable,
      animalLikesTable,
      swipeEventsTable,
      animalImpressionsDailyTable,
    },
  });

  return {
    listLive(): Promise<AnimalWithShelter[]> {
      return db
        .select({ animal: animalsTable, shelter: sheltersTable })
        .from(animalsTable)
        .innerJoin(sheltersTable, eq(animalsTable.shelterId, sheltersTable.id))
        .where(eq(animalsTable.status, "live"))
        .all();
    },

    listLiveRandom(limit: number): Promise<AnimalWithShelter[]> {
      return db
        .select({ animal: animalsTable, shelter: sheltersTable })
        .from(animalsTable)
        .innerJoin(sheltersTable, eq(animalsTable.shelterId, sheltersTable.id))
        .where(eq(animalsTable.status, "live"))
        .orderBy(sql`random()`)
        .limit(limit)
        .all();
    },

    findWithShelter(id: string): Promise<AnimalWithShelter | undefined> {
      return db
        .select({ animal: animalsTable, shelter: sheltersTable })
        .from(animalsTable)
        .innerJoin(sheltersTable, eq(animalsTable.shelterId, sheltersTable.id))
        .where(eq(animalsTable.id, id))
        .get();
    },

    likedAnimalIds(userId: string): Promise<string[]> {
      return db
        .select({ id: animalLikesTable.animalId })
        .from(animalLikesTable)
        .where(eq(animalLikesTable.userId, userId))
        .all()
        .then((rows) => rows.map((row) => row.id));
    },

    async recentSkipReasons(userId: string, since: Date): Promise<Set<string>> {
      const rows = await db
        .select({
          animalId: swipeEventsTable.animalId,
          action: swipeEventsTable.action,
          reason: swipeEventsTable.reason,
        })
        .from(swipeEventsTable)
        .where(and(eq(swipeEventsTable.userId, userId), gt(swipeEventsTable.createdAt, since)))
        .orderBy(desc(swipeEventsTable.createdAt))
        .all();
      const seen = new Set<string>();
      const reasons = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.animalId)) continue;
        seen.add(row.animalId);
        if (row.action === "skip" && row.reason) reasons.add(row.reason);
      }
      return reasons;
    },

    async recentSkipIds(userId: string, since: Date): Promise<string[]> {
      // The latest event per animal decides. An animal skipped after `since`
      // has its latest event inside that window too, so one query is enough.
      const rows = await db
        .select({ animalId: swipeEventsTable.animalId, action: swipeEventsTable.action })
        .from(swipeEventsTable)
        .where(and(eq(swipeEventsTable.userId, userId), gt(swipeEventsTable.createdAt, since)))
        .orderBy(desc(swipeEventsTable.createdAt))
        .all();
      const seen = new Set<string>();
      const still: string[] = [];
      for (const row of rows) {
        if (seen.has(row.animalId)) continue;
        seen.add(row.animalId);
        if (row.action === "skip") still.push(row.animalId);
      }
      return still;
    },

    findLike(userId: string, animalId: string) {
      return db
        .select()
        .from(animalLikesTable)
        .where(and(eq(animalLikesTable.userId, userId), eq(animalLikesTable.animalId, animalId)))
        .get();
    },

    insertLike(userId: string, animalId: string) {
      return db
        .insert(animalLikesTable)
        .values({ userId, animalId })
        .returning()
        .get();
    },

    deleteLike(userId: string, animalId: string) {
      return db
        .delete(animalLikesTable)
        .where(and(eq(animalLikesTable.userId, userId), eq(animalLikesTable.animalId, animalId)))
        .returning({ id: animalLikesTable.id })
        .get();
    },

    listLikes(userId: string): Promise<AnimalWithShelter[]> {
      return db
        .select({ animal: animalsTable, shelter: sheltersTable })
        .from(animalLikesTable)
        .innerJoin(animalsTable, eq(animalLikesTable.animalId, animalsTable.id))
        .innerJoin(sheltersTable, eq(animalsTable.shelterId, sheltersTable.id))
        .where(eq(animalLikesTable.userId, userId))
        .orderBy(desc(animalLikesTable.createdAt))
        .all();
    },

    likesByAnimalIds(userId: string, animalIds: string[]): Promise<Set<string>> {
      if (animalIds.length === 0) return Promise.resolve(new Set());
      return db
        .select({ id: animalLikesTable.animalId })
        .from(animalLikesTable)
        .where(
          and(eq(animalLikesTable.userId, userId), inArray(animalLikesTable.animalId, animalIds)),
        )
        .all()
        .then((rows) => new Set(rows.map((row) => row.id)));
    },

    insertSwipe(
      userId: string,
      animalId: string,
      action: "like" | "skip" | "undo",
      reason?: string | null,
    ) {
      return db
        .insert(swipeEventsTable)
        .values({ userId, animalId, action, reason: reason ?? null })
        .returning()
        .get();
    },

    deleteSkipSwipes(userId: string) {
      return db
        .delete(swipeEventsTable)
        .where(and(eq(swipeEventsTable.userId, userId), eq(swipeEventsTable.action, "skip")))
        .run();
    },

    lastSwipe(userId: string) {
      return db
        .select()
        .from(swipeEventsTable)
        .where(eq(swipeEventsTable.userId, userId))
        .orderBy(desc(swipeEventsTable.createdAt))
        .limit(1)
        .get();
    },

    incrementDailyImpression(animalId: string, day: string) {
      return db
        .insert(animalImpressionsDailyTable)
        .values({ animalId, day, count: 1 })
        .onConflictDoUpdate({
          target: [animalImpressionsDailyTable.animalId, animalImpressionsDailyTable.day],
          set: { count: sql`${animalImpressionsDailyTable.count} + 1` },
        })
        .run();
    },
  };
}

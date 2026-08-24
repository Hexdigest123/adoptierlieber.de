import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { animalImpressionsDailyTable, animalsTable } from "../schema";

export function createImpressionRepo(env: Env) {
  const db = drizzle(getDb(env), {
    schema: { animalImpressionsDailyTable, animalsTable },
  });

  return {
    sumSince(shelterId: string, dayFrom: string) {
      return db
        .select({ n: sql<number>`coalesce(sum(${animalImpressionsDailyTable.count}), 0)` })
        .from(animalImpressionsDailyTable)
        .innerJoin(animalsTable, eq(animalsTable.id, animalImpressionsDailyTable.animalId))
        .where(
          and(eq(animalsTable.shelterId, shelterId), gte(animalImpressionsDailyTable.day, dayFrom)),
        )
        .get();
    },

    sumLikesLive(shelterId: string) {
      return db
        .select({ n: sql<number>`coalesce(sum(${animalsTable.likeCount}), 0)` })
        .from(animalsTable)
        .where(and(eq(animalsTable.shelterId, shelterId), eq(animalsTable.status, "live")))
        .get();
    },

    listStaleDrafts(shelterId: string, before: Date) {
      return db
        .select()
        .from(animalsTable)
        .where(
          and(
            eq(animalsTable.shelterId, shelterId),
            eq(animalsTable.status, "draft"),
            sql`${animalsTable.updatedAt} < ${before.getTime()}`,
          ),
        )
        .all();
    },

    listLiveWithoutPhotos(animalIds: string[]) {
      if (animalIds.length === 0) return Promise.resolve([] as { id: string }[]);
      return db
        .select({ id: animalsTable.id })
        .from(animalsTable)
        .where(and(inArray(animalsTable.id, animalIds), eq(animalsTable.status, "live")))
        .all();
    },
  };
}

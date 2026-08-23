import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { animalsTable, sheltersTable } from "../schema";
import type { Animal } from "../types";

export type AnimalWrite = {
  shelterId: string;
  name: string;
  species: Animal["species"];
  breed?: string | null;
  sex?: Animal["sex"];
  ageMonths?: number | null;
  ageUnknown?: boolean;
  size?: Animal["size"];
  colors?: string[] | null;
  traits?: string[] | null;
  tagline?: string | null;
  description?: string | null;
  photos?: string[] | null;
  status?: Animal["status"];
  vaccinated?: Animal["vaccinated"];
  neutered?: Animal["neutered"];
  chipped?: Animal["chipped"];
  houseTrained?: Animal["houseTrained"];
  bondedPartner?: string | null;
  bondedAnimalId?: string | null;
  bondGroupId?: string | null;
  publishedAt?: Date | null;
  foundHomeAt?: Date | null;
  foundHomeNote?: string | null;
};

export function createAnimalRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { animalsTable, sheltersTable } });

  return {
    create(input: AnimalWrite) {
      return db
        .insert(animalsTable)
        .values({ ...input, updatedAt: new Date() })
        .returning()
        .get();
    },

    findById(id: string) {
      return db.select().from(animalsTable).where(eq(animalsTable.id, id)).get();
    },

    findByIds(ids: string[]) {
      if (!ids.length) return Promise.resolve([]);
      return db.select().from(animalsTable).where(inArray(animalsTable.id, ids)).all();
    },

    listByBondGroup(groupId: string) {
      return db
        .select()
        .from(animalsTable)
        .where(eq(animalsTable.bondGroupId, groupId))
        .all();
    },

    listByBondGroups(groupIds: string[]) {
      if (!groupIds.length) return Promise.resolve([]);
      return db
        .select()
        .from(animalsTable)
        .where(inArray(animalsTable.bondGroupId, groupIds))
        .all();
    },

    update(id: string, values: Partial<AnimalWrite>) {
      return db
        .update(animalsTable)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(animalsTable.id, id))
        .returning()
        .get();
    },

    delete(id: string) {
      return db.delete(animalsTable).where(eq(animalsTable.id, id)).run();
    },

    listByShelter(shelterId: string, status?: Animal["status"]) {
      const where = status
        ? and(eq(animalsTable.shelterId, shelterId), eq(animalsTable.status, status))
        : eq(animalsTable.shelterId, shelterId);
      return db
        .select()
        .from(animalsTable)
        .where(where)
        .orderBy(desc(animalsTable.updatedAt))
        .all();
    },

    countByShelter(shelterId: string, status?: Animal["status"]) {
      const where = status
        ? and(eq(animalsTable.shelterId, shelterId), eq(animalsTable.status, status))
        : eq(animalsTable.shelterId, shelterId);
      return db
        .select({ n: sql<number>`count(*)` })
        .from(animalsTable)
        .where(where)
        .get();
    },

    incrementLikes(id: string, delta: number) {
      return db
        .update(animalsTable)
        .set({
          likeCount: sql`max(0, ${animalsTable.likeCount} + ${delta})`,
          updatedAt: new Date(),
        })
        .where(eq(animalsTable.id, id))
        .run();
    },

    incrementImpressions(id: string) {
      return db
        .update(animalsTable)
        .set({
          impressionCount: sql`${animalsTable.impressionCount} + 1`,
        })
        .where(and(eq(animalsTable.id, id), eq(animalsTable.status, "live")))
        .run();
    },
  };
}

import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { reviewsTable, usersTable } from "../schema";
import type { ReviewStatus } from "../types";

export type PublicReviewRow = {
  id: string;
  name: string;
  stars: number;
  body: string;
  userId: string;
  displayName: string | null;
  userName: string;
  avatarKey: string | null;
};

export type ReviewListParams = {
  status?: ReviewStatus;
  q?: string;
  offset: number;
  limit: number;
};

function likePattern(q: string): string {
  return `%${q.toLowerCase().replace(/[%_]/g, "\\$&")}%`;
}

export function createReviewRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { reviewsTable, usersTable } });

  return {
    create(input: { userId: string; name: string; stars: number; body: string }) {
      return db.insert(reviewsTable).values(input).returning().get();
    },

    findById(id: string) {
      return db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).get();
    },

    listApprovedRandom(limit: number): Promise<PublicReviewRow[]> {
      return db
        .select({
          id: reviewsTable.id,
          name: reviewsTable.name,
          stars: reviewsTable.stars,
          body: reviewsTable.body,
          userId: reviewsTable.userId,
          displayName: usersTable.displayName,
          userName: usersTable.name,
          avatarKey: usersTable.avatarKey,
        })
        .from(reviewsTable)
        .innerJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
        .where(eq(reviewsTable.status, "approved"))
        .orderBy(sql`random()`)
        .limit(limit)
        .all();
    },

    async list(params: ReviewListParams) {
      const filters = [];
      if (params.status) {
        filters.push(eq(reviewsTable.status, params.status));
      }
      if (params.q) {
        const p = likePattern(params.q);
        filters.push(
          sql`(lower(${reviewsTable.name}) like ${p} escape '\\' or lower(${reviewsTable.body}) like ${p} escape '\\')`,
        );
      }
      const where = filters.length ? and(...filters) : undefined;
      const [totalRow, items] = await Promise.all([
        db.select({ n: sql<number>`count(*)` }).from(reviewsTable).where(where).get(),
        db
          .select()
          .from(reviewsTable)
          .where(where)
          .orderBy(desc(reviewsTable.createdAt))
          .limit(params.limit)
          .offset(params.offset)
          .all(),
      ]);
      return { items, total: Number(totalRow?.n ?? 0) };
    },

    approve(id: string, decidedBy: string) {
      return db
        .update(reviewsTable)
        .set({
          status: "approved",
          decidedAt: new Date(),
          decidedBy,
        })
        .where(eq(reviewsTable.id, id))
        .returning()
        .get();
    },

    delete(id: string) {
      return db.delete(reviewsTable).where(eq(reviewsTable.id, id)).run();
    },
  };
}

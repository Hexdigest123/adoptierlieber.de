import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { threadReadsTable } from "../schema";

export function createThreadReadRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { threadReadsTable } });

  return {
    upsert(threadId: string, userId: string, lastReadAt: Date) {
      return db
        .insert(threadReadsTable)
        .values({ threadId, userId, lastReadAt })
        .onConflictDoUpdate({
          target: [threadReadsTable.threadId, threadReadsTable.userId],
          set: { lastReadAt },
        })
        .returning()
        .get();
    },

    listByUserThreads(userId: string, threadIds: string[]) {
      if (threadIds.length === 0) return Promise.resolve([] as { threadId: string; lastReadAt: Date }[]);
      return db
        .select({ threadId: threadReadsTable.threadId, lastReadAt: threadReadsTable.lastReadAt })
        .from(threadReadsTable)
        .where(
          and(eq(threadReadsTable.userId, userId), inArray(threadReadsTable.threadId, threadIds)),
        )
        .all();
    },

    find(threadId: string, userId: string) {
      return db
        .select()
        .from(threadReadsTable)
        .where(and(eq(threadReadsTable.threadId, threadId), eq(threadReadsTable.userId, userId)))
        .get();
    },
  };
}

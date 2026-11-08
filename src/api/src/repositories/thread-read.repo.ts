import { and, eq, inArray } from "drizzle-orm";
import { inChunks } from "../lib/d1";
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
      return inChunks(threadIds, (chunk) =>
        db
          .select({ threadId: threadReadsTable.threadId, lastReadAt: threadReadsTable.lastReadAt })
          .from(threadReadsTable)
          .where(
            and(eq(threadReadsTable.userId, userId), inArray(threadReadsTable.threadId, chunk)),
          )
          .all(),
      );
    },
  };
}

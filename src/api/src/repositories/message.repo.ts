import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { messagesTable } from "../schema";

export function createMessageRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { messagesTable } });

  return {
    create(input: {
      threadId: string;
      authorUserId: string | null;
      kind: "user" | "system";
      body: string;
    }) {
      return db.insert(messagesTable).values(input).returning().get();
    },

    findById(id: string) {
      return db.select().from(messagesTable).where(eq(messagesTable.id, id)).get();
    },

    // rowid is insertion order; created_at only has 1s resolution
    listByThread(threadId: string, afterMessageId?: string) {
      const where = afterMessageId
        ? and(
            eq(messagesTable.threadId, threadId),
            sql`${messagesTable}.rowid > (SELECT rowid FROM messages WHERE id = ${afterMessageId})`,
          )
        : eq(messagesTable.threadId, threadId);
      return db.select().from(messagesTable).where(where).orderBy(asc(sql`${messagesTable}.rowid`)).all();
    },

    lastByThread(threadId: string) {
      return db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.threadId, threadId))
        .orderBy(desc(sql`${messagesTable}.rowid`))
        .get();
    },
  };
}

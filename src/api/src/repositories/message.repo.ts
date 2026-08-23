import { and, asc, desc, eq, gt } from "drizzle-orm";
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

    listByThread(threadId: string, afterCreatedAt?: Date) {
      const where = afterCreatedAt
        ? and(eq(messagesTable.threadId, threadId), gt(messagesTable.createdAt, afterCreatedAt))
        : eq(messagesTable.threadId, threadId);
      return db.select().from(messagesTable).where(where).orderBy(asc(messagesTable.createdAt)).all();
    },

    lastByThread(threadId: string) {
      return db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.threadId, threadId))
        .orderBy(desc(messagesTable.createdAt))
        .get();
    },
  };
}

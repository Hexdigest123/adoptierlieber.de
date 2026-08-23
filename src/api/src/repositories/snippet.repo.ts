import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import { replySnippetsTable } from "../schema";

export function createSnippetRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { replySnippetsTable } });

  return {
    listByShelter(shelterId: string) {
      return db
        .select()
        .from(replySnippetsTable)
        .where(eq(replySnippetsTable.shelterId, shelterId))
        .all();
    },

    findById(id: string) {
      return db.select().from(replySnippetsTable).where(eq(replySnippetsTable.id, id)).get();
    },

    create(input: { shelterId: string; title: string; body: string }) {
      return db.insert(replySnippetsTable).values(input).returning().get();
    },

    update(id: string, values: { title?: string; body?: string }) {
      return db
        .update(replySnippetsTable)
        .set(values)
        .where(eq(replySnippetsTable.id, id))
        .returning()
        .get();
    },

    delete(id: string) {
      return db.delete(replySnippetsTable).where(eq(replySnippetsTable.id, id)).run();
    },
  };
}

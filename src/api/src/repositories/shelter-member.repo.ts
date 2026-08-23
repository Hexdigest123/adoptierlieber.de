import { drizzle } from "drizzle-orm/d1";
import { and, eq } from "drizzle-orm";
import { shelterMembersTable } from "../schema";
import { getDb, type Env } from "../config/env";

export function createShelterMemberRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { shelterMembersTable } });

  return {
    create(input: { userId: string; shelterId: string; role: number }) {
      return db
        .insert(shelterMembersTable)
        .values(input)
        .returning({
          id: shelterMembersTable.id,
          userId: shelterMembersTable.userId,
          shelterId: shelterMembersTable.shelterId,
          role: shelterMembersTable.role,
        })
        .get();
    },

    findMembership(userId: string, shelterId: string) {
      return db
        .select()
        .from(shelterMembersTable)
        .where(
          and(eq(shelterMembersTable.userId, userId), eq(shelterMembersTable.shelterId, shelterId)),
        )
        .get();
    },

    listByUser(userId: string) {
      return db
        .select()
        .from(shelterMembersTable)
        .where(eq(shelterMembersTable.userId, userId))
        .all();
    },

    listByShelter(shelterId: string) {
      return db
        .select()
        .from(shelterMembersTable)
        .where(eq(shelterMembersTable.shelterId, shelterId))
        .all();
    },

    updateRole(userId: string, shelterId: string, role: number) {
      return db
        .update(shelterMembersTable)
        .set({ role })
        .where(
          and(eq(shelterMembersTable.userId, userId), eq(shelterMembersTable.shelterId, shelterId)),
        )
        .returning()
        .get();
    },

    delete(userId: string, shelterId: string) {
      return db
        .delete(shelterMembersTable)
        .where(
          and(eq(shelterMembersTable.userId, userId), eq(shelterMembersTable.shelterId, shelterId)),
        )
        .run();
    },
  };
}

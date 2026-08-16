import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { sheltersTable } from "../schema";
import type { Env } from "../config/env";

export function createShelterRepo(env: Env) {
  const db = drizzle(env.adoptierlieber, { schema: { sheltersTable } });

  return {
    create(input: {
      orgName: string;
      street: string;
      zip: string;
      city: string;
      website?: string;
      registrationNumber?: string;
      description?: string;
    }) {
      return db
        .insert(sheltersTable)
        .values(input)
        .returning({
          id: sheltersTable.id,
          orgName: sheltersTable.orgName,
          verificationStatus: sheltersTable.verificationStatus,
        })
        .get();
    },

    findById(id: string) {
      return db.select().from(sheltersTable).where(eq(sheltersTable.id, id)).get();
    },
  };
}

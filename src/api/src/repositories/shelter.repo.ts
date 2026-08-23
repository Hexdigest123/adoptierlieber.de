import { and, isNotNull, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { sheltersTable } from "../schema";
import { getDb, type Env } from "../config/env";
import type { ApplicationField, ShelterChecklist } from "../types";

export type ShelterUpdate = {
  orgName?: string;
  street?: string;
  zip?: string;
  city?: string;
  website?: string | null;
  registrationNumber?: string | null;
  description?: string | null;
  notifyEmail?: string | null;
  notifyLastError?: string | null;
  logoKey?: string | null;
  lat?: number | null;
  lng?: number | null;
  geocodedAt?: Date | null;
  archivedAt?: Date | null;
  applicationForm?: ApplicationField[];
  checklist?: ShelterChecklist;
};

export function createShelterRepo(env: Env) {
  const db = drizzle(getDb(env), { schema: { sheltersTable } });

  return {
    create(input: {
      orgName: string;
      street: string;
      zip: string;
      city: string;
      website?: string;
      registrationNumber?: string;
      description?: string;
      notifyEmail?: string;
      lat?: number | null;
      lng?: number | null;
      geocodedAt?: Date | null;
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

    listDigestTargets() {
      return db
        .select()
        .from(sheltersTable)
        .where(
          and(
            eq(sheltersTable.verificationStatus, "verified"),
            isNotNull(sheltersTable.notifyEmail),
            isNull(sheltersTable.archivedAt),
          ),
        )
        .all();
    },

    update(id: string, values: ShelterUpdate) {
      return db.update(sheltersTable).set(values).where(eq(sheltersTable.id, id)).returning().get();
    },

    updateVerification(
      id: string,
      values: {
        verificationStatus: "pending" | "verified" | "rejected";
        verificationReason: string | null;
        verificationDecidedAt: Date;
        verificationDecidedBy: string;
      },
    ) {
      return db
        .update(sheltersTable)
        .set(values)
        .where(eq(sheltersTable.id, id))
        .returning()
        .get();
    },

    delete(id: string) {
      return db.delete(sheltersTable).where(eq(sheltersTable.id, id)).run();
    },
  };
}

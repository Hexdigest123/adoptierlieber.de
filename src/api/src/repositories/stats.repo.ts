import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { getDb, type Env } from "../config/env";
import type { VisitSection } from "../lib/visit-sections";
import {
  donationClicksDailyTable,
  loginsDailyTable,
  pageVisitsDailyTable,
  sheltersTable,
  statsReportsTable,
} from "../schema";

export function createStatsRepo(env: Env) {
  const db = drizzle(getDb(env), {
    schema: {
      donationClicksDailyTable,
      loginsDailyTable,
      pageVisitsDailyTable,
      sheltersTable,
      statsReportsTable,
    },
  });

  return {
    incrementVisit(day: string, section: VisitSection) {
      return db
        .insert(pageVisitsDailyTable)
        .values({ day, section, count: 1 })
        .onConflictDoUpdate({
          target: [pageVisitsDailyTable.day, pageVisitsDailyTable.section],
          set: { count: sql`${pageVisitsDailyTable.count} + 1` },
        })
        .run();
    },

    incrementLogin(day: string) {
      return db
        .insert(loginsDailyTable)
        .values({ day, count: 1 })
        .onConflictDoUpdate({
          target: loginsDailyTable.day,
          set: { count: sql`${loginsDailyTable.count} + 1` },
        })
        .run();
    },

    incrementDonationClick(shelterId: string, day: string) {
      return db
        .insert(donationClicksDailyTable)
        .values({ shelterId, day, count: 1 })
        .onConflictDoUpdate({
          target: [donationClicksDailyTable.day, donationClicksDailyTable.shelterId],
          set: { count: sql`${donationClicksDailyTable.count} + 1` },
        })
        .run();
    },

    listVisits(day: string) {
      return db
        .select({ section: pageVisitsDailyTable.section, count: pageVisitsDailyTable.count })
        .from(pageVisitsDailyTable)
        .where(eq(pageVisitsDailyTable.day, day))
        .all();
    },

    findLogins(day: string) {
      return db
        .select({ count: loginsDailyTable.count })
        .from(loginsDailyTable)
        .where(eq(loginsDailyTable.day, day))
        .get();
    },

    listDonationClicks(day: string) {
      return db
        .select({
          orgName: sheltersTable.orgName,
          city: sheltersTable.city,
          count: donationClicksDailyTable.count,
        })
        .from(donationClicksDailyTable)
        .innerJoin(sheltersTable, eq(sheltersTable.id, donationClicksDailyTable.shelterId))
        .where(eq(donationClicksDailyTable.day, day))
        .orderBy(desc(donationClicksDailyTable.count), sheltersTable.orgName)
        .all();
    },

    async claimReport(day: string): Promise<boolean> {
      const rows = await db
        .insert(statsReportsTable)
        .values({ day })
        .onConflictDoNothing()
        .returning({ day: statsReportsTable.day })
        .all();
      return rows.length > 0;
    },

    releaseReport(day: string) {
      return db.delete(statsReportsTable).where(eq(statsReportsTable.day, day)).run();
    },
  };
}

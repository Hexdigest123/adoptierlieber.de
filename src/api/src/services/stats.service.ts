import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { berlinDay, previousDay } from "../lib/day";
import { dailyStatsTemplate } from "../lib/email-templates";
import { sendMail } from "../lib/mail";
import { notifyRecipient } from "../lib/notify";
import { donationClickSchema, recordVisitSchema, shelterIdSchema } from "../lib/zod";
import { createImpressionRepo } from "../repositories/impression.repo";
import { createShelterRepo } from "../repositories/shelter.repo";
import { createStatsRepo } from "../repositories/stats.repo";

const TOP_ANIMALS = 5;

export async function recordLogin(env: Env): Promise<void> {
  try {
    await createStatsRepo(env).incrementLogin(berlinDay());
  } catch (error: unknown) {
    console.error("login counter failed", error);
  }
}

export function createStatsService(env: Env) {
  const repo = createStatsRepo(env);
  const shelterRepo = createShelterRepo(env);

  return {
    async recordVisit(input: unknown): Promise<void> {
      const data = recordVisitSchema.parse(input);
      await repo.incrementVisit(berlinDay(), data.section);
    },

    async recordDonationClick(id: string, input: unknown): Promise<void> {
      const shelterId = shelterIdSchema.parse(id);
      donationClickSchema.parse(input);
      const shelter = await shelterRepo.findById(shelterId);
      if (
        !shelter ||
        shelter.verificationStatus !== "verified" ||
        shelter.archivedAt ||
        !shelter.donationUrl?.trim()
      ) {
        throw new HTTPException(404, { message: "shelter not found" });
      }
      await repo.incrementDonationClick(shelterId, berlinDay());
    },
  };
}

export async function sendDailyStats(env: Env, now: Date = new Date()): Promise<void> {
  const to = notifyRecipient();
  if (!to) return;

  const day = previousDay(berlinDay(now));
  const repo = createStatsRepo(env);
  // the claim row makes the job idempotent; a failed send releases it
  if (!(await repo.claimReport(day))) return;

  try {
    const impressions = createImpressionRepo(env);
    const [visits, logins, viewTotal, viewTop, clicks] = await Promise.all([
      repo.listVisits(day),
      repo.findLogins(day),
      impressions.sumOnDay(day),
      impressions.topOnDay(day, TOP_ANIMALS),
      repo.listDonationClicks(day),
    ]);
    await sendMail(
      dailyStatsTemplate({
        to,
        day,
        visits: {
          total: visits.reduce((sum, row) => sum + row.count, 0),
          bySection: [...visits].sort((a, b) => b.count - a.count),
        },
        logins: logins?.count ?? 0,
        views: { total: Number(viewTotal?.n) || 0, top: viewTop },
        donations: {
          total: clicks.reduce((sum, row) => sum + row.count, 0),
          byShelter: clicks,
        },
      }),
    );
  } catch (error: unknown) {
    await repo.releaseReport(day).catch(() => undefined);
    throw error;
  }
}

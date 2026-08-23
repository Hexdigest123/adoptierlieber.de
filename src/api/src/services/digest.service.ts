import type { Env } from "../config/env";
import { unansweredDigestTemplate } from "../lib/email-templates";
import { sendMail } from "../lib/mail";
import { createAnimalRepo } from "../repositories/animal.repo";
import { createShelterRepo } from "../repositories/shelter.repo";
import { createThreadRepo } from "../repositories/thread.repo";
import { createUserRepo } from "../repositories/user.repo";

const UNANSWERED_MS = 48 * 60 * 60 * 1000;

export async function sendDailyDigests(env: Env): Promise<void> {
  const shelters = createShelterRepo(env);
  const threads = createThreadRepo(env);
  const animals = createAnimalRepo(env);
  const users = createUserRepo(env);
  const since = new Date(Date.now() - UNANSWERED_MS);
  const targets = await shelters.listDigestTargets();

  for (const shelter of targets) {
    const to = shelter.notifyEmail?.trim();
    if (!to) continue;
    const rows = await threads.listUnansweredSince(shelter.id, since);
    if (rows.length === 0) continue;

    const items: { animalName: string; adopterName: string; hours: number; threadId: string }[] =
      [];
    for (const row of rows.slice(0, 20)) {
      const [animal, adopter] = await Promise.all([
        animals.findById(row.animalId),
        users.findById(row.adopterUserId),
      ]);
      items.push({
        animalName: animal?.name ?? "–",
        adopterName: adopter?.displayName || adopter?.name || "–",
        hours: Math.max(48, Math.round((Date.now() - row.lastMessageAt.getTime()) / 3_600_000)),
        threadId: row.id,
      });
    }

    try {
      await sendMail(
        unansweredDigestTemplate({
          to,
          orgName: shelter.orgName,
          threads: items,
        }),
      );
      if (shelter.notifyLastError) {
        await shelters.update(shelter.id, { notifyLastError: null });
      }
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : "send failed";
      await shelters.update(shelter.id, { notifyLastError: message.slice(0, 280) });
    }
  }
}

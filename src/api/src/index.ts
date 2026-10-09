import app from "./app";
import { getDb, type Env } from "./config/env";
import { sendDailyDigests } from "./services/digest.service";
import { backfillGeocodes } from "./services/geocode-backfill.service";
import { sendDailyStats } from "./services/stats.service";
import { createUserService } from "./services/user.service";

export { ChatRoom } from "./durable-objects/chat-room";

const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

// keep in sync with triggers.crons in wrangler.jsonc
const STATS_CRON = "0 5 * * *";

async function purgeAudit(env: Env): Promise<void> {
  // created_at is unix seconds (drizzle mode "timestamp"); a ms cutoff matches every row.
  const cutoff = Math.floor((Date.now() - AUDIT_RETENTION_MS) / 1000);
  await getDb(env)
    .prepare("DELETE FROM admin_audit WHERE created_at < ?")
    .bind(cutoff)
    .run();
}

export default {
  fetch: app.fetch.bind(app),
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === STATS_CRON) {
      ctx.waitUntil(sendDailyStats(env).catch((error) => console.error(error)));
      return;
    }
    ctx.waitUntil(
      Promise.all([
        purgeAudit(env),
        sendDailyDigests(env).catch((error) => console.error(error)),
        createUserService(env)
          .purgeUnverified()
          .catch((error) => console.error(error)),
        backfillGeocodes(env).catch((error) => console.error(error)),
      ]),
    );
  },
};

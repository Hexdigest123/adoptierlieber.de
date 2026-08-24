import app from "./app";
import { getDb, type Env } from "./config/env";
import { sendDailyDigests } from "./services/digest.service";

export { ChatRoom } from "./durable-objects/chat-room";

const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

async function purgeAudit(env: Env): Promise<void> {
  const cutoff = Date.now() - AUDIT_RETENTION_MS;
  await getDb(env)
    .prepare("DELETE FROM admin_audit WHERE created_at < ?")
    .bind(cutoff)
    .run();
}

export default {
  fetch: app.fetch.bind(app),
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      Promise.all([purgeAudit(env), sendDailyDigests(env).catch((error) => console.error(error))]),
    );
  },
};

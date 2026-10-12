import { getDb, type Env } from "../config/env";
import { GeocodeUnavailableError, lookupAddress, resolveHomePlace } from "../lib/geocode";

/** Rows one cron run looks up at most (cache hits included). */
const BATCH = 50;
// A shelter address Geoapify cannot place is retried monthly, not daily.
const NO_MATCH_RETRY_MS = 30 * 24 * 60 * 60 * 1000;

type Summary = {
  shelters: number;
  sheltersNoMatch: number;
  users: number;
  usersNoMatch: number;
  stopped: string | null;
};

/**
 * Cron: fill coordinates that are missing because geocoding was unavailable
 * (outage, daily budget, per-user allowance) when a place or address was
 * saved. Shelters first (the public map), then adopters' home places. Stops
 * at the first unavailable lookup and leaves the rest for the next run.
 */
export async function backfillGeocodes(env: Env): Promise<Summary> {
  const db = getDb(env);
  const summary: Summary = {
    shelters: 0,
    sheltersNoMatch: 0,
    users: 0,
    usersNoMatch: 0,
    stopped: null,
  };
  let left = BATCH;
  try {
    // geocoded_at is null when the coordinates are missing or predate an address change.
    const retryBefore = Math.floor((Date.now() - NO_MATCH_RETRY_MS) / 1000);
    const { results: shelters } = await db
      .prepare(
        `SELECT id, street, zip, city FROM shelters
         WHERE archived_at IS NULL AND verification_status != 'rejected'
           AND (geocoded_at IS NULL OR (lat IS NULL AND geocoded_at < ?))
         ORDER BY created_at
         LIMIT ?`,
      )
      .bind(retryBefore, left)
      .all<{ id: string; street: string; zip: string; city: string }>();
    for (const row of shelters) {
      left -= 1;
      const geo = await lookupAddress(env, row.street, row.zip, row.city);
      const now = Math.floor(Date.now() / 1000);
      // Matching on the address skips rows edited meanwhile; the edit geocoded them itself.
      // No match keeps the old pin, if any, and waits for the monthly retry.
      const update = geo
        ? db
            .prepare(
              `UPDATE shelters SET lat = ?, lng = ?, geocoded_at = ?
               WHERE id = ? AND street = ? AND zip = ? AND city = ?`,
            )
            .bind(geo.lat, geo.lng, now, row.id, row.street, row.zip, row.city)
        : db
            .prepare(
              `UPDATE shelters SET geocoded_at = ?
               WHERE id = ? AND street = ? AND zip = ? AND city = ?`,
            )
            .bind(now, row.id, row.street, row.zip, row.city);
      await update.run();
      if (geo) summary.shelters += 1;
      else summary.sheltersNoMatch += 1;
    }

    if (left <= 0) return summary;
    const { results: users } = await db
      .prepare(
        `SELECT id, home_query FROM users
         WHERE home_query IS NOT NULL AND home_lat IS NULL AND suspended_at IS NULL
         LIMIT ?`,
      )
      .bind(left)
      .all<{ id: string; home_query: string }>();
    for (const row of users) {
      const hit = await resolveHomePlace(env, row.home_query);
      // An unknown place drops home_query so it is not retried; the typed label stays.
      const update = hit
        ? db
            .prepare(
              `UPDATE users SET home_label = ?, home_country = ?, home_lat = ?, home_lng = ?
               WHERE id = ? AND home_query = ? AND home_lat IS NULL`,
            )
            .bind(hit.label, hit.country, hit.lat, hit.lng, row.id, row.home_query)
        : db
            .prepare(
              `UPDATE users SET home_query = NULL
               WHERE id = ? AND home_query = ? AND home_lat IS NULL`,
            )
            .bind(row.id, row.home_query);
      await update.run();
      if (hit) summary.users += 1;
      else summary.usersNoMatch += 1;
    }
    return summary;
  } catch (err) {
    if (!(err instanceof GeocodeUnavailableError)) throw err;
    summary.stopped = err.message;
    return summary;
  } finally {
    console.log(`geocode backfill ${JSON.stringify(summary)}`);
  }
}

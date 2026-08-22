import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { createShelterService } from "../../services/shelter.service";
import { sendMail } from "../../lib/mail";
import {
  shelterRegistrationNotificationTemplate,
  verifyEmailTemplate,
} from "../../lib/email-templates";
import { readCreateBody } from "../../lib/avatar";

export const shelters = new Hono<AppEnv>();

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Register a new shelter together with its owner account. */
shelters.post("/", rateLimitByIp("create-shelter", 5), async (c) => {
  const { fields, avatar } = await readCreateBody(c.req.raw);
  const result = await createShelterService(c.env).create(fields, avatar);
  if (result && "verificationToken" in result) {
    c.executionCtx.waitUntil(
      sendMail(
        verifyEmailTemplate({ to: asString(fields.email), token: result.verificationToken }),
      ),
    );
    // empty string must fall back to the default receiver
    const teamInbox = process.env.SECRET_CONTACT_TO;
    if (teamInbox) {
      c.executionCtx.waitUntil(
        sendMail(
          shelterRegistrationNotificationTemplate({
            to: teamInbox,
            orgName: asString(fields.orgName),
            street: asString(fields.street),
            zip: asString(fields.zip),
            city: asString(fields.city),
            website: asString(fields.website) || undefined,
            registrationNumber: asString(fields.registrationNumber) || undefined,
            name: asString(fields.name),
            email: asString(fields.email),
            description: asString(fields.description) || undefined,
          }),
        ),
      );
    }
  }
  return c.json({}, 201);
});

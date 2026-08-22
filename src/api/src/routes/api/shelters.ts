import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { createShelterService } from "../../services/shelter.service";
import { sendMail } from "../../lib/mail";
import {
  shelterRegistrationNotificationTemplate,
  verifyEmailTemplate,
} from "../../lib/email-templates";

export const shelters = new Hono<AppEnv>();

/** Register a new shelter together with its owner account. */
shelters.post("/", rateLimitByIp("create-shelter", 5), async (c) => {
  const input = await c.req.json();
  const result = await createShelterService(c.env).create(input);
  if (result && "verificationToken" in result) {
    c.executionCtx.waitUntil(
      sendMail(verifyEmailTemplate({ to: input.email, token: result.verificationToken })),
    );
    // empty string must fall back to the default receiver
    const teamInbox = process.env.SECRET_CONTACT_TO;
    if (teamInbox) {
      c.executionCtx.waitUntil(
        sendMail(
          shelterRegistrationNotificationTemplate({
            to: teamInbox,
            orgName: input.orgName,
            street: input.street,
            zip: input.zip,
            city: input.city,
            website: input.website,
            registrationNumber: input.registrationNumber,
            name: input.name,
            email: input.email,
            description: input.description,
          }),
        ),
      );
    }
  }
  return c.json({}, 201);
});

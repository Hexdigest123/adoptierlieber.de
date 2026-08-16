import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { createShelterService } from "../../services/shelter.service";
import { sendMail } from "../../lib/mail";

export const shelters = new Hono<AppEnv>();

/** Register a new shelter together with its owner account. */
shelters.post("/", rateLimitByIp("create-shelter", 5), async (c) => {
  const input = await c.req.json();
  const result = await createShelterService(c.env).create(input);
  if (result && "verificationToken" in result) {
    c.executionCtx.waitUntil(
      sendMail({
        to: input.email,
        subject: "Verify your email",
        text: `Your verification token is: ${result.verificationToken}. It expires in 24 hours.`,
      }),
    );
    // empty string must fall back to the default receiver
    const teamInbox = process.env.SECRET_CONTACT_RECEIVER || process.env.SECRET_RECEIVER_INFO;
    if (teamInbox) {
      c.executionCtx.waitUntil(
        sendMail({
          to: teamInbox,
          subject: `New shelter registration: ${input.orgName}`,
          text: `A new shelter registered and awaits verification.\n\nOrganization: ${input.orgName}\nAddress: ${input.street}, ${input.zip} ${input.city}\nWebsite: ${input.website ?? "-"}\nRegistration number: ${input.registrationNumber ?? "-"}\nContact: ${input.name} <${input.email}>\n\nDescription:\n${input.description ?? "-"}`,
        }),
      );
    }
  }
  return c.json({}, 201);
});

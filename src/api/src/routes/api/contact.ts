import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { contactSchema } from "../../lib/zod";
import { sendMail } from "../../lib/mail";
import { contactRequestTemplate } from "../../lib/email-templates";

export const contact = new Hono<AppEnv>();

/** Forward a contact request to the team inbox. */
contact.post("/", rateLimitByIp("contact", 5), async (c) => {
  const input = await c.req.json();
  const data = contactSchema.parse(input);

  // honeypot: silently drop bot submissions without leaking the trap
  if (data.website) {
    return c.json({}, 200);
  }

  // empty string must fall back to the default receiver
  const receiver = process.env.SECRET_CONTACT_TO;
  if (receiver) {
    await sendMail(
      contactRequestTemplate({
        to: receiver,
        name: data.name,
        email: data.email || undefined,
        message: data.message,
      }),
    );
  }

  return c.json({}, 200);
});

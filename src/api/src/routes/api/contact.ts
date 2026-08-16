import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { contactSchema } from "../../lib/zod";
import { sendMail } from "../../lib/mail";

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
  const receiver = process.env.SECRET_CONTACT_RECEIVER || process.env.SECRET_RECEIVER_INFO;
  if (receiver) {
    await sendMail({
      to: receiver,
      subject: `Contact request from ${data.name}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`,
    });
  }

  return c.json({}, 200);
});

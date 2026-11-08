import nodemailer from "nodemailer";
import { LOGO_ATTACHMENT } from "./email-templates";

export const MAIL_SENDER = process.env.SECRET_SMTP_FROM;

export type MailOptions = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

export async function sendMail(options: MailOptions) {
  const user = process.env.SECRET_SMTP_USER;
  const pass = process.env.SECRET_SMTP_PASS;
  const transporter = nodemailer.createTransport({
    host: process.env.SECRET_SMTP_HOST,
    port: Number(process.env.SECRET_SMTP_PORT ?? 587),
    secure: process.env.SECRET_SMTP_SECURE === "true",
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter.sendMail({
    from: MAIL_SENDER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    // Every HTML mail is built by email-templates' layout(), which references the logo by CID.
    attachments: options.html ? [LOGO_ATTACHMENT] : undefined,
  });
}

import nodemailer from "nodemailer";

export const MAIL_SENDER = process.env.SECRET_RECEIVER_INFO;

type MailOptions = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

export async function sendMail(options: MailOptions) {
  const transporter = nodemailer.createTransport({
    host: process.env.SECRET_SMTP_HOST,
    port: Number(process.env.SECRET_SMTP_PORT ?? 587),
    secure: process.env.SECRET_SMTP_SECURE === "true",
    auth: {
      user: process.env.SECRET_MAIL_EMAIL,
      pass: process.env.SECRET_MAIL_PW,
    },
  });

  return transporter.sendMail({
    from: MAIL_SENDER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

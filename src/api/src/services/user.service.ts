import { createUserRepo } from "../repositories/user.repo";
import {
  createUserSchema,
  authenticateSchema,
  deleteUserSchema,
  resetUserSchema as resetPasswordUserSchema,
} from "../lib/zod";
import type { Env } from "../config/env";
import type { PublicSession, PublicUser } from "../types";
import { generateToken, hashPassword, verifyPassword, hashToken } from "../lib/hashing";
import { HTTPException } from "hono/http-exception";
import { createSessionService } from "./session.service";
import { sendMail } from "../lib/mail";

export function createUserService(env: Env) {
  const repo = createUserRepo(env);

  return {
    async create(input: unknown): Promise<PublicUser> {
      const data = createUserSchema.parse(input);

      data.password = await hashPassword(data.password);

      const row = await repo.create(data);

      if (!row) {
        throw new HTTPException(409, { message: "duplicated entry" });
      }
      return { id: row.id, name: row.name, displayName: row.displayName, email: row.email };
    },

    async delete(input: unknown, sessionToken: string): Promise<boolean> {
      const data = deleteUserSchema.parse(input);
      const session = await createSessionService(env).findByToken(sessionToken);
      const user = await repo.findById(session.userId);
      if (!session || !user) {
        throw new HTTPException(404, { message: "session or user not found" });
      }

      if (data.deletionToken) {
        if (await this.compareDeletionToken(data.deletionToken, session.userId)) {
          await createSessionService(env).deleteAllWithUserId(session.userId);
          await repo.delete(session.userId);
        }
      } else {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const { token, hashedToken } = await generateToken();

        try {
          // TODO: add proper translated mail template once design is final
          await sendMail({
            to: user.email,
            subject: "Account deletion requested",
            text: `Your deletion token is: ${token}. It expires in 1 hour.`,
          });
        } catch (e: unknown) {
          console.error(e);
          throw new HTTPException(500, { message: "failed to send deletion email" });
        }

        if (!(await repo.updateDeletionToken(session.userId, hashedToken, expiresAt))) {
          return false;
        }
      }

      return true;
    },

    async reset(input: unknown): Promise<boolean> {
      const data = resetPasswordUserSchema.parse(input);
      if (!data.email) {
        throw new HTTPException(422, { message: "missing values in the body" });
      }
      const user = await repo.findByEmail(data.email);
      if (!user) {
        throw new HTTPException(404, { message: "session or user not found" });
      }

      if (data.resetToken && data.newPassword) {
        if (await this.comparePasswordResetToken(data.resetToken, user.id)) {
          await createSessionService(env).deleteAllWithUserId(user.id);
          const newHashedPassword = await hashPassword(data.newPassword);
          if (!(await repo.updatePassword(user.id, newHashedPassword))) {
            throw new HTTPException(500, { message: "failed to update password" });
          }
          return true;
        }
      } else {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const { token, hashedToken } = await generateToken();

        try {
          // TODO: add proper translated mail template once design is final
          await sendMail({
            to: user.email,
            subject: "Password reset request",
            text: `Your reset token is: ${token}. It expires in 1 hour.`,
          });
        } catch (e: unknown) {
          console.error(e);
          throw new HTTPException(500, { message: "failed to send deletion email" });
        }

        if (!(await repo.updateResetToken(user.id, hashedToken, expiresAt))) {
          return false;
        }
      }

      return true;
    },

    async getById(userId: string): Promise<PublicUser> {
      const row = await repo.findById(userId);
      if (!row) {
        throw new HTTPException(404, { message: "user not found" });
      }
      return { id: row.id, name: row.name, displayName: row.displayName, email: row.email };
    },

    async compareDeletionToken(deletionToken: string, userId: string) {
      const row = await repo.findById(userId);
      if (!row) {
        throw new HTTPException(404, { message: "user not found" });
      }
      if (
        !row.accountDeletionToken ||
        !row.accountDeletionTokenExpiresAt ||
        row.accountDeletionTokenExpiresAt.getTime() < Date.now()
      ) {
        throw new HTTPException(400, { message: "deletion token expired" });
      }

      if ((await hashToken(deletionToken)) !== row.accountDeletionToken) {
        throw new HTTPException(401, { message: "invalid deletion token" });
      }

      return true;
    },

    async comparePasswordResetToken(passwordResetToken: string, userId: string) {
      const row = await repo.findById(userId);
      if (!row) {
        throw new HTTPException(404, { message: "user not found" });
      }
      if (
        !row.passwordResetToken ||
        !row.passwordResetTokenExpiresAt ||
        row.passwordResetTokenExpiresAt.getTime() < Date.now()
      ) {
        throw new HTTPException(400, { message: "reset token expired" });
      }

      if ((await hashToken(passwordResetToken)) !== row.passwordResetToken) {
        throw new HTTPException(401, { message: "invalid reset token" });
      }

      return true;
    },

    async authenticate(input: unknown): Promise<PublicSession> {
      const data = authenticateSchema.parse(input);
      const user = await repo.findByEmail(data.email);
      if (!user) {
        throw new HTTPException(401, { message: "invalid email or password" });
      }

      const valid = await verifyPassword(data.password, user.password);
      if (!valid) {
        throw new HTTPException(401, { message: "invalid email or password" });
      }

      const session = createSessionService(env).create({
        userId: user.id,
      });
      return session;
    },
  };
}

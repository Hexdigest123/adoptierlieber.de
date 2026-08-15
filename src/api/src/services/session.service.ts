import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { generateToken, hashToken } from "../lib/hashing";
import { createSessionSchema } from "../lib/zod";
import { createSessionRepo } from "../repositories/session.repo";
import type { PublicSession, Session } from "../types";

export function createSessionService(env: Env) {
  const repo = createSessionRepo(env);

  return {
    async create(input: unknown): Promise<PublicSession> {
      const data = createSessionSchema.parse(input);

      // generate and hash token
      const { token, hashedToken } = await generateToken();
      data.sessionToken = hashedToken;
      data.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // create new session
      let row = await repo.create({
        userId: data.userId,
        sessionToken: data.sessionToken,
        expiresAt: data.expiresAt,
        // TODO: implement with frontend integration
        ipAddress: null,
        userAgent: null,
      });

      if (!row) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const { token, hashedToken } = await generateToken();
          row = await repo.create({
            userId: data.userId,
            sessionToken: hashedToken,
            expiresAt: data.expiresAt,
            ipAddress: null,
            userAgent: null,
          });
          if (row) {
            return { sessionToken: token, expiresAt: row.expiresAt };
          }
        }
      }

      if (!row) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }

      return { sessionToken: token, expiresAt: row.expiresAt };
    },
    async deleteAllWithUserId(userId: string): Promise<boolean> {
      return (await repo.deleteAllWithUserId(userId)).length > 0;
    },
    async findByToken(sessionToken: string): Promise<Session> {
      const hashedToken = await hashToken(sessionToken);
      const session = await repo.find(hashedToken);
      if (!session) {
        throw new HTTPException(404, { message: "session not found" });
      }
      return session;
    },
    async validate(sessionToken: string): Promise<Session> {
      const hashedSessionToken: string = await hashToken(sessionToken);

      const session = await repo.find(hashedSessionToken);
      if (!session) {
        throw new HTTPException(401, { message: "invalid session" });
      }
      const currentDate: Date = new Date();

      if (session.expiresAt.getTime() < currentDate.getTime()) {
        await repo.deleteWithToken(session.sessionToken);
        throw new HTTPException(401, { message: "invalid session" });
      }

      await repo.updateLastUsedWithToken(session.sessionToken);

      return session;
    },
    async refreshExpiresAtWithToken(sessionToken: string): Promise<boolean> {
      const hashedSessionToken = await hashToken(sessionToken);
      const session = await repo.find(hashedSessionToken);
      if (!session) {
        throw new HTTPException(401, { message: "invalid session" });
      }
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      if (!(await repo.updateExpiresAtWithToken(session.sessionToken, newExpiresAt))) {
        return false;
      }
      return true;
    },
  };
}

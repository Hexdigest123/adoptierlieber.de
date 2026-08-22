import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { createShelterSchema } from "../lib/zod";
import { generateToken, hashPassword } from "../lib/hashing";
import { hasPrivilege, SHELTER_ROLE, type ShelterRole } from "../lib/roles";
import { createUserRepo } from "../repositories/user.repo";
import { createShelterRepo } from "../repositories/shelter.repo";
import { createShelterMemberRepo } from "../repositories/shelter-member.repo";
import type { ShelterMember } from "../types";
import { parseAvatarFile, putAvatar } from "../lib/avatar";

export function createShelterService(env: Env) {
  const userRepo = createUserRepo(env);
  const shelterRepo = createShelterRepo(env);
  const memberRepo = createShelterMemberRepo(env);

  return {
    /**
     * Register a new shelter together with its owner account.
     * Creates user (+ email-verification token) + shelter (pending) + membership (OWNER).
     */
    async create(
      input: unknown,
      avatarFile: File | null = null,
    ): Promise<{ verificationToken: string } | null> {
      const data = createShelterSchema.parse(input);
      const parsedAvatar = avatarFile ? await parseAvatarFile(avatarFile) : null;

      const hashedPassword = await hashPassword(data.password);
      const { token, hashedToken } = await generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      let user;
      try {
        user = await userRepo.create({
          name: data.name,
          displayName: data.displayName,
          email: data.email,
          password: hashedPassword,
          emailVerificationToken: hashedToken,
          emailVerificationTokenExpiresAt: expiresAt,
        });
      } catch (e: unknown) {
        if (await userRepo.findByEmail(data.email)) {
          throw new HTTPException(409, { message: "email already registered" });
        }
        throw e;
      }

      let shelter;
      try {
        shelter = await shelterRepo.create({
          orgName: data.orgName,
          street: data.street,
          zip: data.zip,
          city: data.city,
          website: data.website,
          registrationNumber: data.registrationNumber,
          description: data.description,
        });
      } catch (e: unknown) {
        await userRepo.delete(user.id);
        throw e;
      }
      if (!shelter) {
        await userRepo.delete(user.id);
        throw new HTTPException(500, { message: "something wen't wrong" });
      }

      try {
        await memberRepo.create({
          userId: user.id,
          shelterId: shelter.id,
          role: SHELTER_ROLE.OWNER,
        });
      } catch (e: unknown) {
        await userRepo.delete(user.id);
        await shelterRepo.delete(shelter.id);
        throw e;
      }

      if (parsedAvatar) {
        try {
          const avatarKey = await putAvatar(env, user.id, parsedAvatar);
          await userRepo.updateAvatarKey(user.id, avatarKey);
        } catch (e: unknown) {
          console.error(e);
        }
      }

      return { verificationToken: token };
    },

    async getMembership(userId: string, shelterId: string): Promise<ShelterMember | undefined> {
      return memberRepo.findMembership(userId, shelterId);
    },

    /**
     * Assert that a user holds at least `minPrivilege` within a shelter.
     * Ring check: role <= minPrivilege. GLOBAL_ADMIN bypasses shelter checks.
     */
    async assertRole(
      userId: string,
      shelterId: string,
      minPrivilege: ShelterRole,
    ): Promise<ShelterMember> {
      const membership = await memberRepo.findMembership(userId, shelterId);
      if (!membership) {
        throw new HTTPException(403, { message: "insufficient shelter privileges" });
      }
      if (
        membership.role !== SHELTER_ROLE.GLOBAL_ADMIN &&
        !hasPrivilege(membership.role, minPrivilege)
      ) {
        throw new HTTPException(403, { message: "insufficient shelter privileges" });
      }
      return membership;
    },
  };
}

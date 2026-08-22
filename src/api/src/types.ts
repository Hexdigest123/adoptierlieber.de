import type { InferSelectModel } from "drizzle-orm";
import type { Env } from "./config/env";
import type { sessionsTable, shelterMembersTable, sheltersTable, usersTable } from "./schema";

export type AppEnv = {
  Bindings: Env;
  Variables: {
    userId: string;
    sessionToken: string;
  };
};

export type User = InferSelectModel<typeof usersTable>;
export type PublicUser = Pick<User, "id" | "name" | "displayName" | "email"> & {
  hasAvatar: boolean;
};
export type Session = InferSelectModel<typeof sessionsTable>;
export type PublicSession = Pick<Session, "sessionToken" | "expiresAt">;
export type Shelter = InferSelectModel<typeof sheltersTable>;
export type ShelterMember = InferSelectModel<typeof shelterMembersTable>;

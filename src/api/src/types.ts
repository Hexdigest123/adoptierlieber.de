import type { InferSelectModel } from "drizzle-orm";
import type { Env } from "./config/env";
import type {
  animalsTable,
  messagesTable,
  reviewsTable,
  sessionsTable,
  shelterInvitesTable,
  shelterMembersTable,
  sheltersTable,
  threadsTable,
  usersTable,
} from "./schema";

export type AppEnv = {
  Bindings: Env;
  Variables: {
    userId: string;
    sessionToken: string;
  };
};

export type User = InferSelectModel<typeof usersTable>;
export type ShelterMembershipSummary = {
  shelter_id: string;
  org_name: string;
  role: number;
  verification_status: "pending" | "verified" | "rejected";
};

export type PublicUser = Pick<User, "id" | "name" | "displayName" | "email"> & {
  hasAvatar: boolean;
  platform_role: number;
  suspended_at: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  home_query: string | null;
  home_label: string | null;
  home_country: string | null;
  home_lat: number | null;
  home_lng: number | null;
  location_precision: "place" | "gps" | null;
  max_range_km: number | null;
  preferences: Record<string, unknown> | null;
  memberships: ShelterMembershipSummary[];
};
export type Session = InferSelectModel<typeof sessionsTable>;
export type PublicSession = Pick<Session, "sessionToken" | "expiresAt">;
export type Shelter = InferSelectModel<typeof sheltersTable>;
export type ShelterMember = InferSelectModel<typeof shelterMembersTable>;
export type Animal = InferSelectModel<typeof animalsTable>;
export type AnimalSpecies = Animal["species"];
export type AnimalSex = Animal["sex"];
export type AnimalSize = Animal["size"];
export type Thread = InferSelectModel<typeof threadsTable>;
export type Message = InferSelectModel<typeof messagesTable>;
export type ShelterInvite = InferSelectModel<typeof shelterInvitesTable>;
export type Review = InferSelectModel<typeof reviewsTable>;
export type ReviewStatus = Review["status"];

export type ApplicationFieldType = "short" | "long" | "select" | "yesno";

export type ApplicationField = {
  id: string;
  type: ApplicationFieldType;
  label: string;
  required: boolean;
  options?: string[];
  hidden?: boolean;
};

export type ApplicationAnswer = {
  field_id: string;
  label: string;
  type: ApplicationFieldType;
  value: string;
};

export type ShelterChecklist = {
  profile?: boolean;
  team?: boolean;
  notify?: boolean;
  form?: boolean;
  first_animal?: boolean;
  dismissed?: boolean;
};

export type GrantProfile = {
  display_name: string;
  city: string | null;
  zip: string | null;
  preferences: Record<string, unknown> | null;
};

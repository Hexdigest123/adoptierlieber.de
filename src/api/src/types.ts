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
    sessionKind: "full" | "setup";
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
  totp_enabled: boolean;
  passkey_count: number;
  mfa_required: boolean;
  session_kind: "full" | "setup";
};
export type Session = InferSelectModel<typeof sessionsTable>;
export type PublicSession = {
  sessionToken: string;
  expiresAt: Date;
  setup_required?: boolean;
};
export type AuthResult =
  | PublicSession
  | { mfa_required: true; mfa_token: string };
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

import { z } from "zod";

export const emailSchema = z.email().transform((value) => value.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Za-z]/)
  .regex(/\d/);

const optionalCoord = z.coerce.number().gte(-180).lte(180).optional();

export const addressFields = {
  street: z.string().min(1),
  zip: z.string().min(1),
  city: z.string().min(1),
  lat: optionalCoord,
  lng: optionalCoord,
};

export const createUserSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1).optional(),
  email: emailSchema,
  password: passwordSchema,
  ...addressFields,
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    displayName: z.string().nullable().optional(),
    street: z.string().min(1).optional(),
    zip: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    lat: optionalCoord.nullable(),
    lng: optionalCoord.nullable(),
    home_query: z.string().min(1).nullable().optional(),
    home_label: z.string().min(1).nullable().optional(),
    home_country: z.string().min(1).nullable().optional(),
    home_lat: optionalCoord.nullable(),
    home_lng: optionalCoord.nullable(),
    location_precision: z.enum(["place", "gps"]).nullable().optional(),
    max_range_km: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
    preferences: z.record(z.string(), z.unknown()).nullable().optional(),
    taste_weights: z.record(z.string(), z.number()).nullable().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.displayName !== undefined ||
      value.street !== undefined ||
      value.zip !== undefined ||
      value.city !== undefined ||
      value.lat !== undefined ||
      value.lng !== undefined ||
      value.home_query !== undefined ||
      value.home_label !== undefined ||
      value.home_country !== undefined ||
      value.home_lat !== undefined ||
      value.home_lng !== undefined ||
      value.location_precision !== undefined ||
      value.max_range_km !== undefined ||
      value.preferences !== undefined ||
      value.taste_weights !== undefined,
  );

export const changePasswordSchema = z.object({
  current_password: z.string().min(8).max(128),
  new_password: passwordSchema,
});

export const deleteUserSchema = z.object({
  deletionToken: z.string().min(1).optional(),
});

export const resetUserSchema = z.object({
  email: emailSchema.optional(),
  resetToken: z.string().min(1).optional(),
  newPassword: passwordSchema.optional(),
});

export const authenticateSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  token: z.string().min(1),
});

export const createSessionSchema = z.object({
  userId: z.string().min(1),
  sessionToken: z.string().min(1).optional(),
  expiresAt: z.date().optional(),
  userAgent: z.string().optional(),
});

export const createShelterSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1).optional(),
  email: emailSchema,
  password: passwordSchema,
  orgName: z.string().min(1),
  street: z.string().min(1),
  zip: z.string().min(1),
  city: z.string().min(1),
  lat: optionalCoord,
  lng: optionalCoord,
  website: z.url().optional(),
  registrationNumber: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

export const animalSpeciesSchema = z.enum([
  "cat",
  "dog",
  "rabbit",
  "guinea_pig",
  "bird",
  "reptile",
  "other",
]);

export const swipeReasonSchema = z.enum(["too_far", "too_young", "too_old", "species", "other"]);

export const swipeSchema = z.object({
  animal_id: z.string().min(1),
  action: z.enum(["like", "skip", "undo"]),
  reason: swipeReasonSchema.optional(),
});

export const geoSearchSchema = z.object({
  q: z.string().min(1).max(200),
});

export const geoReverseSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export const contactSchema = z.object({
  name: z.string().min(1),
  email: z.union([z.literal(""), emailSchema]).optional(),
  message: z.string().min(1),
  // honeypot: must stay empty; filled by bots only
  website: z.string().optional(),
});

export const speciesSchema = z.enum([
  "cat",
  "dog",
  "rabbit",
  "guinea_pig",
  "bird",
  "reptile",
  "other",
]);

export const animalSexSchema = z.enum(["male", "female", "unknown"]);
export const animalSizeSchema = z.enum(["s", "m", "l", "xl"]);
export const triadSchema = z.enum(["yes", "no", "unknown"]);
export const animalStatusSchema = z.enum(["draft", "live", "found_home"]);

export const updateShelterSchema = z
  .object({
    org_name: z.string().min(1).optional(),
    street: z.string().min(1).optional(),
    zip: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    website: z.union([z.url(), z.literal("")]).nullable().optional(),
    registration_number: z.string().min(1).nullable().optional(),
    description: z.string().min(1).nullable().optional(),
    notify_email: emailSchema.optional(),
  })
  .refine(
    (value) =>
      value.org_name !== undefined ||
      value.street !== undefined ||
      value.zip !== undefined ||
      value.city !== undefined ||
      value.website !== undefined ||
      value.registration_number !== undefined ||
      value.description !== undefined ||
      value.notify_email !== undefined,
  );

export const animalWriteSchema = z.object({
  name: z.string().min(1).max(80),
  species: speciesSchema,
  breed: z.string().min(1).max(80).nullable().optional(),
  sex: animalSexSchema.nullable().optional(),
  age_months: z.coerce.number().int().min(0).max(600).nullable().optional(),
  age_unknown: z.boolean().optional(),
  size: animalSizeSchema.nullable().optional(),
  colors: z.array(z.string().min(1).max(40)).max(8).nullable().optional(),
  traits: z.array(z.string().min(1).max(40)).max(16).nullable().optional(),
  tagline: z.string().min(1).max(140).nullable().optional(),
  description: z.string().min(1).max(8000).nullable().optional(),
  vaccinated: triadSchema.nullable().optional(),
  neutered: triadSchema.nullable().optional(),
  chipped: triadSchema.nullable().optional(),
  house_trained: triadSchema.nullable().optional(),
  bonded_partner: z.string().min(1).max(80).nullable().optional(),
  bonded_animal_id: z.string().min(1).nullable().optional(),
  bonded_animal_ids: z.array(z.string().min(1)).max(99).optional(),
});

export const createPairSchema = z.object({
  a: animalWriteSchema,
  b: animalWriteSchema,
});

export const createGroupSchema = z.object({
  members: z.array(animalWriteSchema).min(2).max(100),
});

export const replySnippetSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(2000),
});

export const assignThreadSchema = z.object({
  user_id: z.string().min(1).nullable(),
});

export const adminOrphanTransferSchema = z.object({
  user_id: z.string().min(1),
});

export const createAnimalSchema = animalWriteSchema;
export const updateAnimalSchema = animalWriteSchema.partial().refine((value) =>
  Object.values(value).some((entry) => entry !== undefined),
);

export const foundHomeSchema = z.object({
  note: z.string().max(280).optional(),
});

export const applicationFieldSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.enum(["short", "long", "select", "yesno"]),
    label: z.string().max(120),
    required: z.boolean(),
    options: z.array(z.string().min(1).max(80)).max(20).optional(),
    hidden: z.boolean().optional(),
  })
  .refine((field) => field.hidden || field.label.length > 0)
  .refine((field) => field.hidden || field.type !== "select" || (field.options && field.options.length > 0));

export const applicationFormSchema = z.array(applicationFieldSchema).max(12);

export const shelterChecklistSchema = z.object({
  profile: z.boolean().optional(),
  team: z.boolean().optional(),
  notify: z.boolean().optional(),
  form: z.boolean().optional(),
  first_animal: z.boolean().optional(),
  dismissed: z.boolean().optional(),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.union([z.literal(1), z.literal(2)]).optional(),
});

export const transferOwnerSchema = z.object({
  user_id: z.string().min(1),
});

export const createThreadSchema = z.object({
  animal_id: z.string().min(1),
  grant_email: z.literal(true),
  grant_profile: z.literal(true),
  message: z.string().max(2000).optional(),
  answers: z
    .array(
      z.object({
        field_id: z.string().min(1),
        value: z.string().max(2000),
      }),
    )
    .max(12)
    .optional(),
});

export const createMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const photoReorderSchema = z.object({
  photos: z.array(z.string().min(1)).min(1).max(8),
});

export const adminBanSchema = z.object({
  reason: z.string().min(1).max(2000),
});

export const adminRejectionSchema = z.object({
  reason: z.string().min(1).max(2000),
});

export const adminNoteSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const adminInviteSchema = z.object({
  email: emailSchema,
});

export const banLookupSchema = z.object({
  name: z.string().min(1),
  ...addressFields,
});

export const inviteAcceptanceSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1).optional(),
  password: passwordSchema,
  ...addressFields,
});

export const AUDIT_ACTIONS = [
  "suspend",
  "unsuspend",
  "delete_user",
  "ban",
  "drop_ban",
  "approve",
  "deny",
  "invite",
  "revoke_invite",
  "remove_admin",
  "note",
  "ban_lookup_hit",
  "transfer_shelter",
  "archive_shelter",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

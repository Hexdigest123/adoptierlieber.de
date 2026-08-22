import { z } from "zod";

export const emailSchema = z.email().transform((value) => value.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Za-z]/)
  .regex(/\d/);

export const createUserSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1).optional(),
  email: emailSchema,
  password: passwordSchema,
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    displayName: z.string().nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.displayName !== undefined);

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
  website: z.url().optional(),
  registrationNumber: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1),
  email: emailSchema,
  message: z.string().min(1),
  // honeypot: must stay empty; filled by bots only
  website: z.string().optional(),
});

import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1).optional(),
  email: z.email(),
  password: z.string().min(8),
});

export const deleteUserSchema = z.object({
  deletionToken: z.string().min(1).optional(),
});

export const resetUserSchema = z.object({
  email: z.string().min(1).optional(),
  resetToken: z.string().min(1).optional(),
  newPassword: z.string().min(8).optional(),
});

export const authenticateSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const verifyEmailSchema = z.object({
  email: z.email(),
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
  email: z.email(),
  password: z.string().min(8),
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
  email: z.email(),
  message: z.string().min(1),
  // honeypot: must stay empty; filled by bots only
  website: z.string().optional(),
});

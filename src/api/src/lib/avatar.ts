import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

type AvatarContentType = "image/jpeg" | "image/png" | "image/webp";

/** Client MIME/extension is spoofable. Type comes from the payload prefix. */
function sniffImageType(bytes: Uint8Array): AvatarContentType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function avatarObjectKey(userId: string): string {
  return `avatars/${userId}`;
}

export type ParsedAvatar = {
  bytes: ArrayBuffer;
  contentType: string;
};

export async function parseAvatarFile(file: File): Promise<ParsedAvatar> {
  if (file.size > AVATAR_MAX_BYTES) {
    throw new HTTPException(400, { message: "avatar too large" });
  }
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > AVATAR_MAX_BYTES) {
    throw new HTTPException(400, { message: "avatar too large" });
  }
  const contentType = sniffImageType(new Uint8Array(bytes));
  if (!contentType) {
    throw new HTTPException(400, { message: "unsupported avatar type" });
  }
  return { bytes, contentType };
}

export async function putAvatar(
  env: Env,
  userId: string,
  avatar: ParsedAvatar,
): Promise<string> {
  const key = avatarObjectKey(userId);
  await env.adoptierlieber_images.put(key, avatar.bytes, {
    httpMetadata: { contentType: avatar.contentType },
  });
  return key;
}

export async function deleteAvatar(env: Env, userId: string): Promise<void> {
  await env.adoptierlieber_images.delete(avatarObjectKey(userId));
}

export async function getAvatarObject(env: Env, userId: string) {
  return env.adoptierlieber_images.get(avatarObjectKey(userId));
}

/** Multipart if a file is present; otherwise JSON. */
export async function readCreateBody(
  request: Request,
): Promise<{ fields: Record<string, unknown>; avatar: File | null }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const avatarEntry = form.get("avatar");
    const avatar = avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : null;
    const fields: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (key === "avatar") continue;
      if (typeof value === "string" && value.trim() !== "") {
        fields[key] = value;
      }
    }
    return { fields, avatar };
  }
  return { fields: (await request.json()) as Record<string, unknown>, avatar: null };
}

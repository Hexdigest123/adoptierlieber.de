import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { parseAvatarFile, type ParsedAvatar } from "./avatar";

export const ANIMAL_PHOTO_MAX = 8;

export function animalPhotoKey(animalId: string, slot: number): string {
  return `animals/${animalId}/${slot}`;
}

export function parsePhotoSlot(value: string): number {
  const slot = Number(value);
  if (!Number.isInteger(slot) || slot < 0 || slot >= ANIMAL_PHOTO_MAX) {
    throw new HTTPException(400, { message: "invalid photo" });
  }
  return slot;
}

export async function parseAnimalPhoto(file: File): Promise<ParsedAvatar> {
  try {
    return await parseAvatarFile(file);
  } catch (error: unknown) {
    if (error instanceof HTTPException) {
      throw new HTTPException(400, { message: error.message.replace("avatar", "photo") });
    }
    throw error;
  }
}

export async function putAnimalPhoto(
  env: Env,
  animalId: string,
  slot: number,
  photo: ParsedAvatar,
): Promise<string> {
  const key = animalPhotoKey(animalId, slot);
  await env.adoptierlieber_images.put(key, photo.bytes, {
    httpMetadata: { contentType: photo.contentType },
  });
  return key;
}

export async function deleteAnimalPhoto(env: Env, animalId: string, slot: number): Promise<void> {
  await env.adoptierlieber_images.delete(animalPhotoKey(animalId, slot));
}

export async function getAnimalPhotoObject(env: Env, animalId: string, slot: number) {
  return env.adoptierlieber_images.get(animalPhotoKey(animalId, slot));
}

export type Env = {
  BASIC_AUTH_USER?: string;
  BASIC_AUTH_PASSWORD?: string;
  ENVIRONMENT?: string;
  PUBLIC_SITE_URL?: string;
  RATE_LIMIT_KV: KVNamespace;
  adoptierlieber?: D1Database;
  adoptierlieber_staging?: D1Database;
  adoptierlieber_images: R2Bucket;
  CHAT_ROOM: DurableObjectNamespace<import("../durable-objects/chat-room").ChatRoom>;
};

export function getDb(env: Env): D1Database {
  const db = env.adoptierlieber ?? env.adoptierlieber_staging;
  if (!db) {
    throw new Error("missing D1 binding adoptierlieber");
  }
  return db;
}

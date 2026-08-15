export type Env = {
  BASIC_AUTH_USER?: string;
  BASIC_AUTH_PASSWORD?: string;
  ENVIRONMENT?: string;
  RATE_LIMIT_KV: KVNamespace;
  adoptierlieber: D1Database;
  adoptierlieber_images: R2Bucket;
};

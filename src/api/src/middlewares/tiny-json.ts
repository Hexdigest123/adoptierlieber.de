import { bodyLimit } from "hono/body-limit";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

const limit = bodyLimit({
  maxSize: 256,
  onError: (c) => c.json({ error: "Payload too large" }, 413),
});

export const tinyJson: MiddlewareHandler<AppEnv> = async (c, next) => {
  const type = c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "application/json") {
    return c.json({ error: "Unsupported media type" }, 415);
  }
  return limit(c, next);
};

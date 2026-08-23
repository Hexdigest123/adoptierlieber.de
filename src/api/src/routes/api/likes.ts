import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { createCatalogService } from "../../services/catalog.service";

export const likes = new Hono<AppEnv>();

likes.use("*", sessionValidation);

likes.get("/", async (c) => {
  const search = new URL(c.req.url).searchParams;
  const result = await createCatalogService(c.env).likes(c.get("userId"), search);
  return c.json(result, 200);
});

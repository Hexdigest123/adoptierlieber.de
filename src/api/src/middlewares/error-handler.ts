import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status as ContentfulStatusCode);
  }
  if (err instanceof ZodError) {
    return c.json({ error: "Invalid request" }, 400);
  }
  console.error(err); // stack stays server-side
  return c.json({ error: "Something wen't wrong!" }, 500);
};

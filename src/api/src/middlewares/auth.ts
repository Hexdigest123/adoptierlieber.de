import type { MiddlewareHandler } from "hono";
import { secretsEqual } from "../lib/hashing";

export const basicAuth: MiddlewareHandler = async (c, next) => {
  const { BASIC_AUTH_USER, BASIC_AUTH_PASSWORD } = c.env;
  if (BASIC_AUTH_USER && BASIC_AUTH_PASSWORD) {
    const expected = "Basic " + btoa(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`);
    if (!secretsEqual(c.req.header("authorization") ?? "", expected)) {
      return c.text("Unauthorized", 401, {
        "WWW-Authenticate": 'Basic realm="staging"',
      });
    }
  }
  await next();
};

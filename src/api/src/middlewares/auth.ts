import type { MiddlewareHandler } from "hono";
import { secretsEqual } from "../lib/hashing";

export const basicAuth: MiddlewareHandler = async (c, next) => {
  const { BASIC_AUTH_USER, BASIC_AUTH_PASSWORD, ENVIRONMENT } = c.env;
  const protectedEnv = Boolean(BASIC_AUTH_USER) || ENVIRONMENT === "staging";
  if (protectedEnv && !BASIC_AUTH_PASSWORD) {
    // Fail closed: a missing password secret must not publish staging.
    console.error("basic auth is configured without BASIC_AUTH_PASSWORD; refusing requests");
    return c.text("Service Unavailable", 503);
  }
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

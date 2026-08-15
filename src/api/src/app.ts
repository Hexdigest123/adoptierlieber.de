import { Hono } from "hono";
import { cors } from "hono/cors";
import { basicAuth } from "./middlewares/auth";
import { errorHandler } from "./middlewares/error-handler";
import routes from "./routes";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.onError(errorHandler);

if (process.env.NODE_ENV !== "production") {
  app.use("*", cors({ origin: (origin) => origin ?? "*" }));
}

app.use("*", basicAuth); // checks if we are in a staging environment and enforces http auth

app.route("/", routes);

export default app;

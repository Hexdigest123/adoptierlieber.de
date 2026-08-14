import { Hono } from "hono";
import { users } from "./api/users";
import type { AppEnv } from "../types";

const api = new Hono<AppEnv>();
api.route("/users", users);

const routes = new Hono<AppEnv>();
routes.route("/api", api);

export default routes;

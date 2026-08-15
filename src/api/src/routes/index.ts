import { Hono } from "hono";
import { users } from "./api/users";
import type { AppEnv } from "../types";
import { sessions } from "./api/sessions";

const api = new Hono<AppEnv>();
api.route("/users", users);
api.route("/sessions", sessions);

const routes = new Hono<AppEnv>();
routes.route("/api", api);

export default routes;

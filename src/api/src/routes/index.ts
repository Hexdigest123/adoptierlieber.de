import { Hono } from "hono";
import { users } from "./api/users";
import type { AppEnv } from "../types";
import { sessions } from "./api/sessions";
import { shelters } from "./api/shelters";
import { contact } from "./api/contact";

const api = new Hono<AppEnv>();
api.route("/users", users);
api.route("/sessions", sessions);
api.route("/shelters", shelters);
api.route("/contact", contact);

const routes = new Hono<AppEnv>();
routes.route("/api", api);

export default routes;

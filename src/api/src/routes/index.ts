import { Hono } from "hono";
import { users } from "./api/users";
import type { AppEnv } from "../types";
import { sessions } from "./api/sessions";
import { shelters } from "./api/shelters";
import { contact } from "./api/contact";
import { admin } from "./api/admin";
import { invites } from "./api/invites";
import { animals } from "./api/animals";
import { chats } from "./api/chats";
import { likes } from "./api/likes";
import { swipes } from "./api/swipes";
import { geo } from "./api/geo";
import { reviews } from "./api/reviews";
import { auth } from "./api/auth";
import { totp } from "./api/totp";
import { passkeys } from "./api/passkeys";

const api = new Hono<AppEnv>();
api.route("/users", users);
api.route("/sessions", sessions);
api.route("/auth", auth);
api.route("/totp", totp);
api.route("/passkeys", passkeys);
api.route("/shelters", shelters);
api.route("/contact", contact);
api.route("/admin", admin);
api.route("/invites", invites);
api.route("/animals", animals);
api.route("/chats", chats);
api.route("/likes", likes);
api.route("/swipes", swipes);
api.route("/geo", geo);
api.route("/reviews", reviews);

const routes = new Hono<AppEnv>();
routes.route("/api", api);

export default routes;

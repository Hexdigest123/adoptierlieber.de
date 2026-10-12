import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { rateLimitByUser } from "../../middlewares/rate-limit";
import { createChatService } from "../../services/chat.service";
import { siteUrl } from "../../lib/email-templates";

export const chats = new Hono<AppEnv>();

/**
 * Browsers always send Origin on a WebSocket handshake; only our site (and
 * its www alias) may open one with the user's cookies. localhost origins are
 * accepted only when the site itself runs on localhost (dev). No Origin means
 * a non-browser client, which can't ride on a victim's cookies anyway.
 */
function socketOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  let site: URL;
  let from: URL;
  try {
    site = new URL(siteUrl());
    from = new URL(origin);
  } catch {
    return false;
  }
  if (from.origin === site.origin) return true;
  if (from.protocol === site.protocol && from.host === `www.${site.host}`) return true;
  const local = (host: string) => host === "localhost" || host === "127.0.0.1";
  return local(site.hostname) && local(from.hostname) && from.protocol === "http:";
}

chats.use("*", sessionValidation);

chats.post("/", rateLimitByUser("create-thread", 8), async (c) => {
  const thread = await createChatService(c.env).create(c.get("userId"), await c.req.json());
  return c.json(thread, 201);
});

chats.get("/", async (c) => {
  const archived = c.req.query("archived");
  const threads = await createChatService(c.env).list(c.get("userId"), {
    shelterId: c.req.query("shelter_id"),
    archived: archived === "1" || archived === "true" ? true : archived === "0" ? false : undefined,
  });
  return c.json({ items: threads }, 200);
});

chats.get("/interest", async (c) => {
  const animalId = c.req.query("animal_id");
  if (!animalId) {
    return c.json({ error: "missing animal" }, 400);
  }
  const context = await createChatService(c.env).interestContext(c.get("userId"), animalId);
  return c.json(context, 200);
});

chats.get("/:id", async (c) => {
  const thread = await createChatService(c.env).get(c.get("userId"), c.req.param("id"));
  return c.json(thread, 200);
});

chats.get("/:id/messages", async (c) => {
  const messages = await createChatService(c.env).listMessages(
    c.get("userId"),
    c.req.param("id"),
    c.req.query("after") ?? undefined,
  );
  return c.json({ items: messages }, 200);
});

chats.post("/:id/messages", rateLimitByUser("chat-message", 40), async (c) => {
  const message = await createChatService(c.env).postMessage(
    c.get("userId"),
    c.req.param("id"),
    await c.req.json(),
  );
  return c.json(message, 201);
});

chats.post("/:id/read", async (c) => {
  await createChatService(c.env).markRead(c.get("userId"), c.req.param("id"));
  return c.json({}, 200);
});

chats.post("/:id/archive", async (c) => {
  await createChatService(c.env).archive(c.get("userId"), c.req.param("id"));
  return c.json({}, 200);
});

chats.put("/:id/assignment", async (c) => {
  const thread = await createChatService(c.env).assign(
    c.get("userId"),
    c.req.param("id"),
    await c.req.json(),
  );
  return c.json(thread, 200);
});

chats.get("/:id/application", async (c) => {
  const card = await createChatService(c.env).application(c.get("userId"), c.req.param("id"));
  return c.json(card, 200);
});

chats.get("/:id/socket", async (c) => {
  if (c.req.header("upgrade") !== "websocket") {
    return c.text("expected websocket", 426);
  }
  if (!socketOriginAllowed(c.req.header("origin"))) {
    return c.json({ error: "origin not allowed" }, 403);
  }
  await createChatService(c.env).get(c.get("userId"), c.req.param("id"));
  const stub = c.env.CHAT_ROOM.getByName(c.req.param("id"));
  const headers = new Headers(c.req.raw.headers);
  headers.set("x-user-id", c.get("userId"));
  headers.set("x-thread-id", c.req.param("id"));
  return stub.fetch(new Request(c.req.raw, { headers }));
});

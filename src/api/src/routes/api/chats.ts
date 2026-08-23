import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { rateLimitByUser } from "../../middlewares/rate-limit";
import { createChatService } from "../../services/chat.service";

export const chats = new Hono<AppEnv>();

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

chats.post("/:id/messages", async (c) => {
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
  await createChatService(c.env).get(c.get("userId"), c.req.param("id"));
  const stub = c.env.CHAT_ROOM.getByName(c.req.param("id"));
  const headers = new Headers(c.req.raw.headers);
  headers.set("x-user-id", c.get("userId"));
  headers.set("x-thread-id", c.req.param("id"));
  return stub.fetch(new Request(c.req.raw, { headers }));
});

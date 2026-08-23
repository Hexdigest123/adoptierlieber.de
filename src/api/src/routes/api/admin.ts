import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { requirePlatformAdmin } from "../../middlewares/platform-admin";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { createAdminService } from "../../services/admin.service";

export const admin = new Hono<AppEnv>();

admin.use("*", sessionValidation, requirePlatformAdmin);

admin.get("/overview", async (c) => {
  return c.json(await createAdminService(c.env).overview());
});

admin.get("/users", async (c) => {
  return c.json(await createAdminService(c.env).listUsers(new URL(c.req.url).searchParams));
});

admin.get("/users/:id", async (c) => {
  return c.json(await createAdminService(c.env).getUser(c.req.param("id")));
});

admin.post("/users/:id/suspension", rateLimitByIp("admin-suspend", 20), async (c) => {
  await createAdminService(c.env).suspend(c.get("userId"), c.req.param("id"));
  return c.json({});
});

admin.delete("/users/:id/suspension", rateLimitByIp("admin-unsuspend", 20), async (c) => {
  await createAdminService(c.env).unsuspend(c.get("userId"), c.req.param("id"));
  return c.json({});
});

admin.delete("/users/:id", rateLimitByIp("admin-delete-user", 10), async (c) => {
  await createAdminService(c.env).deleteUser(c.get("userId"), c.req.param("id"));
  return c.json({});
});

admin.post("/users/:id/ban", rateLimitByIp("admin-ban", 10), async (c) => {
  const input = await c.req.json();
  await createAdminService(c.env).banUser(c.get("userId"), c.req.param("id"), input);
  return c.json({});
});

admin.get("/shelters", async (c) => {
  return c.json(await createAdminService(c.env).listShelters(new URL(c.req.url).searchParams));
});

admin.get("/shelters/:id", async (c) => {
  return c.json(await createAdminService(c.env).getShelter(c.req.param("id")));
});

admin.post("/shelters/:id/owner", rateLimitByIp("admin-transfer-shelter", 10), async (c) => {
  return c.json(
    await createAdminService(c.env).transferOrphan(
      c.get("userId"),
      c.req.param("id"),
      await c.req.json(),
    ),
  );
});

admin.post("/shelters/:id/archive", rateLimitByIp("admin-archive-shelter", 10), async (c) => {
  return c.json(await createAdminService(c.env).archiveOrphan(c.get("userId"), c.req.param("id")));
});

admin.get("/animals", async (c) => {
  return c.json(await createAdminService(c.env).listAnimals(new URL(c.req.url).searchParams));
});

admin.get("/animals/:id", async (c) => {
  return c.json(await createAdminService(c.env).getAnimal(c.req.param("id")));
});

admin.get("/animals/:id/photos/:n", async (c) => {
  const n = Number(c.req.param("n"));
  if (!Number.isInteger(n) || n < 0 || n > 20) {
    return c.json({ error: "photo not found" }, 404);
  }
  const object = await createAdminService(c.env).getAnimalPhoto(c.req.param("id"), n);
  if (!object) {
    return c.json({ error: "photo not found" }, 404);
  }
  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", "private, no-cache");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  return new Response(object.body, { status: 200, headers });
});

admin.get("/applications", async (c) => {
  return c.json(await createAdminService(c.env).listApplications(new URL(c.req.url).searchParams));
});

admin.get("/applications/:id", async (c) => {
  return c.json(await createAdminService(c.env).getApplication(c.req.param("id")));
});

admin.post("/applications/:id/approval", rateLimitByIp("admin-approve", 20), async (c) => {
  await createAdminService(c.env).approve(c.get("userId"), c.req.param("id"));
  return c.json({});
});

admin.post("/applications/:id/rejection", rateLimitByIp("admin-reject", 20), async (c) => {
  const input = await c.req.json();
  await createAdminService(c.env).reject(c.get("userId"), c.req.param("id"), input);
  return c.json({});
});

admin.get("/applications/:id/notes", async (c) => {
  return c.json({ items: await createAdminService(c.env).listNotes(c.req.param("id")) });
});

admin.post("/applications/:id/notes", rateLimitByIp("admin-note", 30), async (c) => {
  const input = await c.req.json();
  const note = await createAdminService(c.env).addNote(c.get("userId"), c.req.param("id"), input);
  return c.json(note, 201);
});

admin.get("/bans", async (c) => {
  return c.json(await createAdminService(c.env).listBans(new URL(c.req.url).searchParams));
});

admin.post("/bans/lookup", rateLimitByIp("admin-ban-lookup", 20), async (c) => {
  const input = await c.req.json();
  return c.json(await createAdminService(c.env).lookupBan(c.get("userId"), input));
});

admin.delete("/bans/:hash", rateLimitByIp("admin-drop-ban", 20), async (c) => {
  await createAdminService(c.env).dropBan(c.get("userId"), c.req.param("hash"));
  return c.json({});
});

admin.get("/audit", async (c) => {
  return c.json(await createAdminService(c.env).listAudit(new URL(c.req.url).searchParams));
});

admin.get("/admins", async (c) => {
  return c.json(await createAdminService(c.env).listAdmins());
});

admin.post("/invites", rateLimitByIp("admin-invite", 10), async (c) => {
  const input = await c.req.json();
  await createAdminService(c.env).invite(c.get("userId"), input);
  return c.json({}, 201);
});

admin.delete("/invites/:id", rateLimitByIp("admin-revoke-invite", 20), async (c) => {
  await createAdminService(c.env).revokeInvite(c.get("userId"), c.req.param("id"));
  return c.json({});
});

admin.delete("/admins/:id", rateLimitByIp("admin-remove-admin", 10), async (c) => {
  await createAdminService(c.env).removeAdmin(c.get("userId"), c.req.param("id"));
  return c.json({});
});

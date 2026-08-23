import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { sessionValidation } from "../../middlewares/session";
import { createShelterService } from "../../services/shelter.service";
import { createAnimalService } from "../../services/animal.service";
import { sendMail } from "../../lib/mail";
import {
  shelterRegistrationNotificationTemplate,
  verifyEmailTemplate,
} from "../../lib/email-templates";
import { readCreateBody } from "../../lib/avatar";

export const shelters = new Hono<AppEnv>();

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Register a new shelter together with its owner account. */
shelters.post("/", rateLimitByIp("create-shelter", 5), async (c) => {
  const { fields, avatar } = await readCreateBody(c.req.raw);
  const result = await createShelterService(c.env).create(fields, avatar);
  if (result && "verificationToken" in result) {
    c.executionCtx.waitUntil(
      sendMail(
        verifyEmailTemplate({ to: asString(fields.email), token: result.verificationToken }),
      ),
    );
    // empty string must fall back to the default receiver
    const teamInbox = process.env.SECRET_CONTACT_TO;
    if (teamInbox) {
      c.executionCtx.waitUntil(
        sendMail(
          shelterRegistrationNotificationTemplate({
            to: teamInbox,
            orgName: asString(fields.orgName),
            street: asString(fields.street),
            zip: asString(fields.zip),
            city: asString(fields.city),
            website: asString(fields.website) || undefined,
            registrationNumber: asString(fields.registrationNumber) || undefined,
            name: asString(fields.name),
            email: asString(fields.email),
            description: asString(fields.description) || undefined,
          }),
        ),
      );
    }
  }
  return c.json({}, 201);
});

shelters.post("/invites/accept", sessionValidation, async (c) => {
  const body = (await c.req.json()) as { token?: string };
  const result = await createShelterService(c.env).acceptInvite(c.get("userId"), body.token ?? "");
  return c.json(result, 200);
});

shelters.get("/:id", sessionValidation, async (c) => {
  const shelter = await createShelterService(c.env).get(c.get("userId"), c.req.param("id"));
  return c.json(shelter, 200);
});

shelters.patch("/:id", sessionValidation, async (c) => {
  const shelter = await createShelterService(c.env).update(
    c.get("userId"),
    c.req.param("id"),
    await c.req.json(),
  );
  return c.json(shelter, 200);
});

shelters.get("/:id/dashboard", sessionValidation, async (c) => {
  const dashboard = await createShelterService(c.env).dashboard(c.get("userId"), c.req.param("id"));
  return c.json(dashboard, 200);
});

shelters.get("/:id/form", sessionValidation, async (c) => {
  const form = await createShelterService(c.env).getForm(c.get("userId"), c.req.param("id"));
  return c.json(form, 200);
});

shelters.put("/:id/form", sessionValidation, async (c) => {
  const form = await createShelterService(c.env).putForm(
    c.get("userId"),
    c.req.param("id"),
    await c.req.json(),
  );
  return c.json(form, 200);
});

shelters.get("/:id/checklist", sessionValidation, async (c) => {
  const checklist = await createShelterService(c.env).getChecklist(
    c.get("userId"),
    c.req.param("id"),
  );
  return c.json(checklist, 200);
});

shelters.patch("/:id/checklist", sessionValidation, async (c) => {
  const checklist = await createShelterService(c.env).patchChecklist(
    c.get("userId"),
    c.req.param("id"),
    await c.req.json(),
  );
  return c.json(checklist, 200);
});

shelters.get("/:id/members", sessionValidation, async (c) => {
  const team = await createShelterService(c.env).listMembers(c.get("userId"), c.req.param("id"));
  return c.json(team, 200);
});

shelters.post("/:id/invites", sessionValidation, async (c) => {
  await createShelterService(c.env).invite(c.get("userId"), c.req.param("id"), await c.req.json());
  return c.json({}, 201);
});

shelters.delete("/:id/members/:userId", sessionValidation, async (c) => {
  await createShelterService(c.env).removeMember(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("userId"),
  );
  return c.json({}, 200);
});

shelters.post("/:id/transfer", sessionValidation, async (c) => {
  await createShelterService(c.env).transfer(c.get("userId"), c.req.param("id"), await c.req.json());
  return c.json({}, 200);
});

shelters.get("/:id/animals", sessionValidation, async (c) => {
  const animals = await createShelterService(c.env).listAnimals(
    c.get("userId"),
    c.req.param("id"),
    c.req.query("status"),
  );
  return c.json({ items: animals }, 200);
});

shelters.post("/:id/animals", sessionValidation, async (c) => {
  const animal = await createAnimalService(c.env).create(
    c.get("userId"),
    c.req.param("id"),
    await c.req.json(),
  );
  return c.json(animal, 201);
});

shelters.post("/:id/animals/pair", sessionValidation, async (c) => {
  const pair = await createAnimalService(c.env).createPair(
    c.get("userId"),
    c.req.param("id"),
    await c.req.json(),
  );
  return c.json(pair, 201);
});

shelters.post("/:id/animals/group", sessionValidation, async (c) => {
  const group = await createAnimalService(c.env).createGroup(
    c.get("userId"),
    c.req.param("id"),
    await c.req.json(),
  );
  return c.json(group, 201);
});

shelters.post("/:id/animals/:animalId/clone", sessionValidation, async (c) => {
  const animal = await createAnimalService(c.env).clone(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("animalId"),
  );
  return c.json(animal, 201);
});

shelters.put("/:id/logo", sessionValidation, async (c) => {
  const form = await c.req.formData();
  const file = form.get("logo") ?? form.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return c.json({ error: "missing logo" }, 400);
  }
  const shelter = await createShelterService(c.env).putLogo(
    c.get("userId"),
    c.req.param("id"),
    file,
  );
  return c.json(shelter, 200);
});

shelters.delete("/:id/logo", sessionValidation, async (c) => {
  const shelter = await createShelterService(c.env).deleteLogo(c.get("userId"), c.req.param("id"));
  return c.json(shelter, 200);
});

shelters.get("/:id/logo", sessionValidation, async (c) => {
  const object = await createShelterService(c.env).getLogo(c.req.param("id"));
  if (!object) {
    return c.json({ error: "logo not found" }, 404);
  }
  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", "private, no-cache");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  return new Response(object.body, { status: 200, headers });
});

shelters.get("/:id/snippets", sessionValidation, async (c) => {
  const items = await createShelterService(c.env).listSnippets(c.get("userId"), c.req.param("id"));
  return c.json({ items }, 200);
});

shelters.post("/:id/snippets", sessionValidation, async (c) => {
  const row = await createShelterService(c.env).createSnippet(
    c.get("userId"),
    c.req.param("id"),
    await c.req.json(),
  );
  return c.json(row, 201);
});

shelters.delete("/:id/snippets/:snippetId", sessionValidation, async (c) => {
  await createShelterService(c.env).deleteSnippet(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("snippetId"),
  );
  return c.json({}, 200);
});

shelters.get("/:id/animals/:animalId", sessionValidation, async (c) => {
  const animal = await createAnimalService(c.env).get(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("animalId"),
  );
  return c.json(animal, 200);
});

shelters.patch("/:id/animals/:animalId", sessionValidation, async (c) => {
  const animal = await createAnimalService(c.env).update(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("animalId"),
    await c.req.json(),
  );
  return c.json(animal, 200);
});

shelters.delete("/:id/animals/:animalId", sessionValidation, async (c) => {
  await createAnimalService(c.env).remove(c.get("userId"), c.req.param("id"), c.req.param("animalId"));
  return c.json({}, 200);
});

shelters.post("/:id/animals/:animalId/publication", sessionValidation, async (c) => {
  const animal = await createAnimalService(c.env).publish(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("animalId"),
  );
  return c.json(animal, 200);
});

shelters.delete("/:id/animals/:animalId/publication", sessionValidation, async (c) => {
  const animal = await createAnimalService(c.env).unpublish(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("animalId"),
  );
  return c.json(animal, 200);
});

shelters.post("/:id/animals/:animalId/home", sessionValidation, async (c) => {
  const animal = await createAnimalService(c.env).markHome(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("animalId"),
    await c.req.json().catch(() => ({})),
  );
  return c.json(animal, 200);
});

shelters.put("/:id/animals/:animalId/photos", sessionValidation, async (c) => {
  const form = await c.req.formData();
  const file = form.get("photo") ?? form.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return c.json({ error: "missing photo" }, 400);
  }
  const animal = await createAnimalService(c.env).putPhoto(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("animalId"),
    file,
  );
  return c.json(animal, 200);
});

shelters.patch("/:id/animals/:animalId/photos", sessionValidation, async (c) => {
  const animal = await createAnimalService(c.env).reorderPhotos(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("animalId"),
    await c.req.json(),
  );
  return c.json(animal, 200);
});

shelters.delete("/:id/animals/:animalId/photos/:slot", sessionValidation, async (c) => {
  const animal = await createAnimalService(c.env).deletePhoto(
    c.get("userId"),
    c.req.param("id"),
    c.req.param("animalId"),
    c.req.param("slot"),
  );
  return c.json(animal, 200);
});

shelters.get("/:id/animals/:animalId/photos/:slot", sessionValidation, async (c) => {
  await createAnimalService(c.env).get(c.get("userId"), c.req.param("id"), c.req.param("animalId"));
  const object = await createAnimalService(c.env).getPhoto(
    c.req.param("animalId"),
    c.req.param("slot"),
  );
  if (!object) {
    return c.json({ error: "photo not found" }, 404);
  }
  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", "private, no-cache");
  if (object.httpEtag) {
    headers.set("etag", object.httpEtag);
  }
  return new Response(object.body, { status: 200, headers });
});

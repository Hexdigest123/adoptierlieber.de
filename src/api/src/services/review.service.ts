import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { listEnvelope, parseListQuery, type ListEnvelope } from "../lib/pagination";
import { isUniqueConstraint } from "../lib/create-account";
import { createReviewSchema, type AuditAction } from "../lib/zod";
import { createAdminRepo } from "../repositories/admin.repo";
import { createReviewRepo } from "../repositories/review.repo";
import { createUserRepo } from "../repositories/user.repo";
import type { Review, ReviewStatus, User } from "../types";

const PUBLIC_REVIEW_LIMIT = 10;

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function publicReview(row: Review) {
  return {
    id: row.id,
    name: row.name,
    stars: row.stars,
    body: row.body,
  };
}

function adminReview(row: Review) {
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    stars: row.stars,
    body: row.body,
    status: row.status,
    decided_at: iso(row.decidedAt),
    decided_by: row.decidedBy,
    created_at: row.createdAt.toISOString(),
  };
}

function actorSnapshot(user: User) {
  return { actorId: user.id, actorName: user.name, actorEmail: user.email };
}

export function createReviewService(env: Env) {
  const reviewRepo = createReviewRepo(env);
  const userRepo = createUserRepo(env);
  const adminRepo = createAdminRepo(env);

  async function requireActor(actorId: string): Promise<User> {
    const actor = await userRepo.findById(actorId);
    if (!actor) {
      throw new HTTPException(401, { message: "invalid session" });
    }
    return actor;
  }

  async function requireReview(id: string): Promise<Review> {
    const review = await reviewRepo.findById(id);
    if (!review) {
      throw new HTTPException(404, { message: "not found" });
    }
    return review;
  }

  async function audit(
    actor: User,
    action: AuditAction,
    target: { type: string; id: string | null; label: string },
  ): Promise<void> {
    await adminRepo.insertAudit({
      action,
      ...actorSnapshot(actor),
      targetType: target.type,
      targetId: target.id,
      targetLabel: target.label,
    });
  }

  return {
    async create(input: unknown, userId: string): Promise<void> {
      const data = createReviewSchema.parse(input);
      if (data.website) {
        return;
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        throw new HTTPException(401, { message: "invalid session" });
      }
      if (user.suspendedAt) {
        throw new HTTPException(403, { message: "account suspended" });
      }

      try {
        await reviewRepo.create({
          userId: user.id,
          name: user.displayName?.trim() || user.name,
          stars: data.stars,
          body: data.body,
        });
      } catch (error: unknown) {
        if (isUniqueConstraint(error)) {
          throw new HTTPException(409, { message: "already reviewed" });
        }
        throw error;
      }
    },

    async listPublic() {
      const items = await reviewRepo.listApprovedRandom(PUBLIC_REVIEW_LIMIT);
      return { items: items.map(publicReview) };
    },

    async listAdmin(search: URLSearchParams): Promise<ListEnvelope<Record<string, unknown>>> {
      const query = parseListQuery(search);
      const rawStatus = search.get("status")?.trim();
      const status: ReviewStatus | undefined =
        rawStatus === "pending" || rawStatus === "approved" ? rawStatus : undefined;
      const { items, total } = await reviewRepo.list({
        status,
        q: search.get("q")?.trim() || undefined,
        offset: query.offset,
        limit: query.per_page,
      });
      return listEnvelope(items.map(adminReview), total, query);
    },

    async approve(actorId: string, reviewId: string): Promise<void> {
      const actor = await requireActor(actorId);
      const review = await requireReview(reviewId);
      if (review.status !== "pending") {
        throw new HTTPException(409, { message: "not pending" });
      }
      await reviewRepo.approve(review.id, actor.id);
      await audit(actor, "approve_review", {
        type: "review",
        id: review.id,
        label: review.name,
      });
    },

    async remove(actorId: string, reviewId: string): Promise<void> {
      const actor = await requireActor(actorId);
      const review = await requireReview(reviewId);
      await reviewRepo.delete(review.id);
      await audit(actor, "delete_review", {
        type: "review",
        id: review.id,
        label: review.name,
      });
    },
  };
}

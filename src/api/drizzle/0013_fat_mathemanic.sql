DELETE FROM `reviews` WHERE `user_id` IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`stars` integer NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`decided_at` integer,
	`decided_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_reviews`("id", "user_id", "name", "stars", "body", "status", "decided_at", "decided_by", "created_at") SELECT "id", "user_id", "name", 5, "body", "status", "decided_at", "decided_by", "created_at" FROM `reviews`;--> statement-breakpoint
DROP TABLE `reviews`;--> statement-breakpoint
ALTER TABLE `__new_reviews` RENAME TO `reviews`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_user_uq` ON `reviews` (`user_id`);--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `reviews` (`status`);--> statement-breakpoint
CREATE INDEX `reviews_created_idx` ON `reviews` (`created_at`);--> statement-breakpoint
CREATE INDEX `reviews_status_created_idx` ON `reviews` (`status`,`created_at`);

CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`decided_at` integer,
	`decided_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `reviews` (`status`);--> statement-breakpoint
CREATE INDEX `reviews_created_idx` ON `reviews` (`created_at`);--> statement-breakpoint
CREATE INDEX `reviews_status_created_idx` ON `reviews` (`status`,`created_at`);
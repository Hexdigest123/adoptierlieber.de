CREATE TABLE `reply_snippets` (
	`id` text PRIMARY KEY NOT NULL,
	`shelter_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reply_snippets_shelter_idx` ON `reply_snippets` (`shelter_id`);--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`query` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_searches_user_idx` ON `saved_searches` (`user_id`);--> statement-breakpoint
CREATE TABLE `thread_reads` (
	`thread_id` text NOT NULL,
	`user_id` text NOT NULL,
	`last_read_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `thread_reads_thread_user_uq` ON `thread_reads` (`thread_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `thread_reads_user_idx` ON `thread_reads` (`user_id`);--> statement-breakpoint
ALTER TABLE `animals` ADD `bonded_animal_id` text;--> statement-breakpoint
ALTER TABLE `shelters` ADD `logo_key` text;--> statement-breakpoint
ALTER TABLE `shelters` ADD `archived_at` integer;--> statement-breakpoint
ALTER TABLE `swipe_events` ADD `reason` text;--> statement-breakpoint
ALTER TABLE `threads` ADD `assigned_user_id` text;--> statement-breakpoint
CREATE INDEX `threads_assigned_idx` ON `threads` (`assigned_user_id`);
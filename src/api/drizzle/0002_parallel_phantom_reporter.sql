ALTER TABLE `sessions` ADD `user_id` text NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `sessions` ADD `session_token` text NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `user_agent` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `ip_address` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `last_used_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `expires_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `created_at` integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_token_unique` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `password_reset_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password_reset_token_expires_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `password_changed_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` integer;
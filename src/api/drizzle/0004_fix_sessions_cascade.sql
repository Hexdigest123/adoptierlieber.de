PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES users(id) ON DELETE cascade,
	`session_token` text NOT NULL,
	`user_agent` text,
	`ip_address` text,
	`last_used_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "user_id", "session_token", "user_agent", "ip_address", "last_used_at", "expires_at", "created_at") SELECT "id", "user_id", "session_token", "user_agent", "ip_address", "last_used_at", "expires_at", "created_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_token_unique` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint

CREATE TABLE `webauthn_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`credential_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text,
	`device_type` text,
	`backed_up` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webauthn_credentials_user_idx` ON `webauthn_credentials` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `webauthn_credentials_credential_id_uq` ON `webauthn_credentials` (`credential_id`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `kind` text DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_pending_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_confirmed_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_last_counter` integer;
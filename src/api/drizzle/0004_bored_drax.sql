ALTER TABLE `users` ADD `email_verification_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verification_token_expires_at` integer;
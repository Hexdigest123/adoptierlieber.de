CREATE TABLE `shelter_members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`shelter_id` text NOT NULL,
	`role` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shelter_members_user_shelter_uq` ON `shelter_members` (`user_id`,`shelter_id`);--> statement-breakpoint
CREATE INDEX `shelter_members_shelter_idx` ON `shelter_members` (`shelter_id`);--> statement-breakpoint
CREATE INDEX `shelter_members_user_idx` ON `shelter_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `shelters` (
	`id` text PRIMARY KEY NOT NULL,
	`org_name` text NOT NULL,
	`street` text NOT NULL,
	`zip` text NOT NULL,
	`city` text NOT NULL,
	`website` text,
	`registration_number` text,
	`description` text,
	`verification_status` text NOT NULL,
	`created_at` integer NOT NULL
);

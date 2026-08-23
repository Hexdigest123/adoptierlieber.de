CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`action` text NOT NULL,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`actor_email` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`target_label` text NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE INDEX `admin_audit_created_idx` ON `admin_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `admin_audit_action_created_idx` ON `admin_audit` (`action`,`created_at`);--> statement-breakpoint
CREATE TABLE `admin_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`invited_by` text,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_invites_token_hash_unique` ON `admin_invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `admin_invites_email_idx` ON `admin_invites` (`email`);--> statement-breakpoint
CREATE TABLE `animal_impressions_daily` (
	`animal_id` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `animal_impressions_daily_uq` ON `animal_impressions_daily` (`animal_id`,`day`);--> statement-breakpoint
CREATE INDEX `animal_impressions_daily_day_idx` ON `animal_impressions_daily` (`day`);--> statement-breakpoint
CREATE TABLE `animal_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `animal_likes_user_animal_uq` ON `animal_likes` (`user_id`,`animal_id`);--> statement-breakpoint
CREATE INDEX `animal_likes_animal_idx` ON `animal_likes` (`animal_id`);--> statement-breakpoint
CREATE TABLE `animals` (
	`id` text PRIMARY KEY NOT NULL,
	`shelter_id` text NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`breed` text,
	`sex` text,
	`age_months` integer,
	`age_unknown` integer DEFAULT false NOT NULL,
	`size` text,
	`colors` text,
	`traits` text,
	`tagline` text,
	`description` text,
	`photos` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`vaccinated` text,
	`neutered` text,
	`chipped` text,
	`house_trained` text,
	`bonded_partner` text,
	`like_count` integer DEFAULT 0 NOT NULL,
	`impression_count` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`found_home_at` integer,
	`found_home_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `animals_shelter_idx` ON `animals` (`shelter_id`);--> statement-breakpoint
CREATE INDEX `animals_status_idx` ON `animals` (`status`);--> statement-breakpoint
CREATE INDEX `animals_shelter_status_idx` ON `animals` (`shelter_id`,`status`);--> statement-breakpoint
CREATE INDEX `animals_species_idx` ON `animals` (`species`);--> statement-breakpoint
CREATE TABLE `application_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`shelter_id` text NOT NULL,
	`author_id` text,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `application_notes_shelter_created_idx` ON `application_notes` (`shelter_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ban_fingerprints` (
	`hash` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`banned_by` text,
	`reason` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`author_user_id` text,
	`kind` text DEFAULT 'user' NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_thread_created_idx` ON `messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `shelter_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`shelter_id` text NOT NULL,
	`email` text NOT NULL,
	`role` integer NOT NULL,
	`token_hash` text NOT NULL,
	`invited_by` text,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shelter_invites_token_hash_unique` ON `shelter_invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `shelter_invites_shelter_idx` ON `shelter_invites` (`shelter_id`);--> statement-breakpoint
CREATE INDEX `shelter_invites_email_idx` ON `shelter_invites` (`email`);--> statement-breakpoint
CREATE TABLE `swipe_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `swipe_events_user_animal_idx` ON `swipe_events` (`user_id`,`animal_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `swipe_events_user_created_idx` ON `swipe_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`shelter_id` text NOT NULL,
	`animal_id` text NOT NULL,
	`adopter_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_message_at` integer NOT NULL,
	`unread_for_shelter` integer DEFAULT true NOT NULL,
	`unread_for_adopter` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`email_granted` integer DEFAULT false NOT NULL,
	`profile_granted` integer DEFAULT false NOT NULL,
	`granted_at` integer,
	`grant_email` text,
	`grant_profile` text,
	`application_answers` text,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`animal_id`) REFERENCES `animals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`adopter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `threads_shelter_animal_adopter_uq` ON `threads` (`shelter_id`,`animal_id`,`adopter_user_id`);--> statement-breakpoint
CREATE INDEX `threads_shelter_last_idx` ON `threads` (`shelter_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `threads_adopter_idx` ON `threads` (`adopter_user_id`);--> statement-breakpoint
CREATE INDEX `threads_animal_idx` ON `threads` (`animal_id`);--> statement-breakpoint
ALTER TABLE `shelters` ADD `verification_reason` text;--> statement-breakpoint
ALTER TABLE `shelters` ADD `verification_decided_at` integer;--> statement-breakpoint
ALTER TABLE `shelters` ADD `verification_decided_by` text;--> statement-breakpoint
ALTER TABLE `shelters` ADD `notify_email` text;--> statement-breakpoint
ALTER TABLE `shelters` ADD `notify_last_error` text;--> statement-breakpoint
ALTER TABLE `shelters` ADD `lat` real;--> statement-breakpoint
ALTER TABLE `shelters` ADD `lng` real;--> statement-breakpoint
ALTER TABLE `shelters` ADD `geocoded_at` integer;--> statement-breakpoint
ALTER TABLE `shelters` ADD `application_form` text;--> statement-breakpoint
ALTER TABLE `shelters` ADD `checklist` text;--> statement-breakpoint
CREATE INDEX `shelters_verification_idx` ON `shelters` (`verification_status`);--> statement-breakpoint
CREATE INDEX `shelters_city_idx` ON `shelters` (`city`);--> statement-breakpoint
ALTER TABLE `users` ADD `platform_role` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `street` text;--> statement-breakpoint
ALTER TABLE `users` ADD `zip` text;--> statement-breakpoint
ALTER TABLE `users` ADD `city` text;--> statement-breakpoint
ALTER TABLE `users` ADD `lat` real;--> statement-breakpoint
ALTER TABLE `users` ADD `lng` real;--> statement-breakpoint
ALTER TABLE `users` ADD `suspended_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `home_query` text;--> statement-breakpoint
ALTER TABLE `users` ADD `home_label` text;--> statement-breakpoint
ALTER TABLE `users` ADD `home_country` text;--> statement-breakpoint
ALTER TABLE `users` ADD `home_lat` real;--> statement-breakpoint
ALTER TABLE `users` ADD `home_lng` real;--> statement-breakpoint
ALTER TABLE `users` ADD `location_precision` text;--> statement-breakpoint
ALTER TABLE `users` ADD `max_range_km` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `preferences` text;--> statement-breakpoint
ALTER TABLE `users` ADD `taste_weights` text;--> statement-breakpoint
UPDATE `users` SET `platform_role` = 0 WHERE `id` = (SELECT `id` FROM `users` ORDER BY `created_at` ASC LIMIT 1);--> statement-breakpoint
CREATE UNIQUE INDEX `users_super_admin_uq` ON `users` (`platform_role`) WHERE "users"."platform_role" = 0;--> statement-breakpoint
CREATE INDEX `users_city_idx` ON `users` (`city`);--> statement-breakpoint
CREATE INDEX `users_platform_role_idx` ON `users` (`platform_role`);
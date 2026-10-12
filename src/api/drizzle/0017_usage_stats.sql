CREATE TABLE `donation_clicks_daily` (
	`shelter_id` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`shelter_id`) REFERENCES `shelters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `donation_clicks_daily_uq` ON `donation_clicks_daily` (`day`,`shelter_id`);--> statement-breakpoint
CREATE INDEX `donation_clicks_daily_shelter_idx` ON `donation_clicks_daily` (`shelter_id`);--> statement-breakpoint
CREATE TABLE `logins_daily` (
	`day` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `page_visits_daily` (
	`day` text NOT NULL,
	`section` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `page_visits_daily_uq` ON `page_visits_daily` (`day`,`section`);--> statement-breakpoint
CREATE TABLE `stats_reports` (
	`day` text PRIMARY KEY NOT NULL,
	`claimed_at` integer NOT NULL
);

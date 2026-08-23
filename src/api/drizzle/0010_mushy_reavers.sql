ALTER TABLE `animals` ADD `bond_group_id` text;--> statement-breakpoint
CREATE INDEX `animals_bond_group_idx` ON `animals` (`bond_group_id`);
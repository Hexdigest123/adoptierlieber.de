-- Data-integrity guards and cleanup (security audit). Custom migration: no schema.ts change.
--
-- 1) Role values. Shelter roles are 1 (owner) and 2 (staff) only; platform roles 0..2.
--    Ring checks are "role <= required", so a stray 0 or negative value grants more, not less.
--    Demote anything out of range to the least privileged role before enforcing it.
UPDATE `shelter_members` SET `role` = 2 WHERE `role` NOT IN (1, 2);
--> statement-breakpoint
UPDATE `shelter_invites` SET `role` = 2 WHERE `role` NOT IN (1, 2);
--> statement-breakpoint
UPDATE `users` SET `platform_role` = 2 WHERE `platform_role` NOT IN (0, 1, 2);
--> statement-breakpoint
-- SQLite can't add CHECK constraints without rebuilding the table, so use triggers.
CREATE TRIGGER IF NOT EXISTS `shelter_members_role_insert_check`
BEFORE INSERT ON `shelter_members`
FOR EACH ROW WHEN NEW.`role` NOT IN (1, 2)
BEGIN
  SELECT RAISE(ABORT, 'invalid shelter role');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `shelter_members_role_update_check`
BEFORE UPDATE OF `role` ON `shelter_members`
FOR EACH ROW WHEN NEW.`role` NOT IN (1, 2)
BEGIN
  SELECT RAISE(ABORT, 'invalid shelter role');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `shelter_invites_role_insert_check`
BEFORE INSERT ON `shelter_invites`
FOR EACH ROW WHEN NEW.`role` NOT IN (1, 2)
BEGIN
  SELECT RAISE(ABORT, 'invalid shelter role');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `shelter_invites_role_update_check`
BEFORE UPDATE OF `role` ON `shelter_invites`
FOR EACH ROW WHEN NEW.`role` NOT IN (1, 2)
BEGIN
  SELECT RAISE(ABORT, 'invalid shelter role');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `users_platform_role_insert_check`
BEFORE INSERT ON `users`
FOR EACH ROW WHEN NEW.`platform_role` NOT IN (0, 1, 2)
BEGIN
  SELECT RAISE(ABORT, 'invalid platform role');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `users_platform_role_update_check`
BEFORE UPDATE OF `platform_role` ON `users`
FOR EACH ROW WHEN NEW.`platform_role` NOT IN (0, 1, 2)
BEGIN
  SELECT RAISE(ABORT, 'invalid platform role');
END;
--> statement-breakpoint
-- 2) Shelter links are rendered as hrefs. The API now only accepts http(s);
--    drop anything else stored before (javascript:, data:, ...).
UPDATE `shelters` SET `website` = NULL
WHERE `website` IS NOT NULL
  AND lower(`website`) NOT LIKE 'http://%'
  AND lower(`website`) NOT LIKE 'https://%';
--> statement-breakpoint
UPDATE `shelters` SET `donation_url` = NULL
WHERE `donation_url` IS NOT NULL
  AND lower(`donation_url`) NOT LIKE 'http://%'
  AND lower(`donation_url`) NOT LIKE 'https://%';
--> statement-breakpoint
-- 3) Bonds must stay inside one shelter. Dissolve any bond that points at, or
--    shares a group with, another shelter's animal (written through the old
--    bond endpoints). Labels on those rows may be attacker-chosen, so clear them.
UPDATE `animals` SET `bond_group_id` = NULL, `bonded_animal_id` = NULL, `bonded_partner` = NULL
WHERE EXISTS (
    SELECT 1 FROM `animals` AS `peer`
    WHERE `peer`.`id` = `animals`.`bonded_animal_id`
      AND `peer`.`shelter_id` <> `animals`.`shelter_id`
  )
  OR `bond_group_id` IN (
    SELECT `bond_group_id` FROM `animals`
    WHERE `bond_group_id` IS NOT NULL
    GROUP BY `bond_group_id`
    HAVING COUNT(DISTINCT `shelter_id`) > 1
  );
--> statement-breakpoint
-- 4) Login and lookups use lower(email) = ?; index the expression.
CREATE INDEX IF NOT EXISTS `users_email_lower_idx` ON `users` (lower(`email`));

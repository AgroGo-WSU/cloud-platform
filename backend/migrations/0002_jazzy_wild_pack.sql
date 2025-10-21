PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `plant` RENAME TO `plantInventory`;--> statement-breakpoint
CREATE TABLE `__new_plantInventory` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plant_type` text,
	`plant_name` text,
	`zone_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zone`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_plantInventory`("id", "user_id", "plant_type", "plant_name", "zone_id") SELECT "id", "user_id", "plant_type", "plant_name", "zone_id" FROM `plantInventory`;--> statement-breakpoint
DROP TABLE `plantInventory`;--> statement-breakpoint
ALTER TABLE `__new_plantInventory` RENAME TO `plantInventory`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_fanSchedule` (
	`id` text PRIMARY KEY NOT NULL,
	`userID` text,
	`sensorId` text,
	`scheduled_time_on` text NOT NULL,
	`scheduled_time_off` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sensorId`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_fanSchedule`("id", "userID", "sensorId", "scheduled_time_on", "scheduled_time_off") SELECT "id", "userID", "sensorId", "scheduled_time_on", "scheduled_time_off" FROM `fanSchedule`;--> statement-breakpoint
DROP TABLE `fanSchedule`;--> statement-breakpoint
ALTER TABLE `__new_fanSchedule` RENAME TO `fanSchedule`;--> statement-breakpoint
CREATE TABLE `__new_pings` (
	`userID` text,
	`sensorId` text,
	`confirmed` text NOT NULL,
	`confirmed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sensorId`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_pings`("userID", "sensorId", "confirmed", "confirmed_at") SELECT "userID", "sensorId", "confirmed", "confirmed_at" FROM `pings`;--> statement-breakpoint
DROP TABLE `pings`;--> statement-breakpoint
ALTER TABLE `__new_pings` RENAME TO `pings`;--> statement-breakpoint
CREATE TABLE `__new_waterSchedule` (
	`id` text PRIMARY KEY NOT NULL,
	`userID` text,
	`sensorId` text,
	`scheduled_time` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sensorId`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_waterSchedule`("id", "userID", "sensorId", "scheduled_time") SELECT "id", "userID", "sensorId", "scheduled_time" FROM `waterSchedule`;--> statement-breakpoint
DROP TABLE `waterSchedule`;--> statement-breakpoint
ALTER TABLE `__new_waterSchedule` RENAME TO `waterSchedule`;--> statement-breakpoint
CREATE TABLE `__new_alert` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`severity` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_alert`("id", "user_id", "message", "severity", "status") SELECT "id", "user_id", "message", "severity", "status" FROM `alert`;--> statement-breakpoint
DROP TABLE `alert`;--> statement-breakpoint
ALTER TABLE `__new_alert` RENAME TO `alert`;--> statement-breakpoint
CREATE TABLE `__new_fanLog` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_instance` text,
	`userID` text,
	`scheduled_time_on_confirm` text NOT NULL,
	`scheduled_time_off_confirm` text NOT NULL,
	`confirmed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`schedule_instance`) REFERENCES `fanSchedule`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_fanLog`("id", "schedule_instance", "userID", "scheduled_time_on_confirm", "scheduled_time_off_confirm", "confirmed_at") SELECT "id", "schedule_instance", "userID", "scheduled_time_on_confirm", "scheduled_time_off_confirm", "confirmed_at" FROM `fanLog`;--> statement-breakpoint
DROP TABLE `fanLog`;--> statement-breakpoint
ALTER TABLE `__new_fanLog` RENAME TO `fanLog`;--> statement-breakpoint
CREATE TABLE `__new_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_integrations`("id", "user_id", "provider", "access_token", "refresh_token", "expires_at") SELECT "id", "user_id", "provider", "access_token", "refresh_token", "expires_at" FROM `integrations`;--> statement-breakpoint
DROP TABLE `integrations`;--> statement-breakpoint
ALTER TABLE `__new_integrations` RENAME TO `integrations`;--> statement-breakpoint
CREATE TABLE `__new_rasPi` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`status` text DEFAULT 'unpaired' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_rasPi`("id", "created_at", "status") SELECT "id", "created_at", "status" FROM `rasPi`;--> statement-breakpoint
DROP TABLE `rasPi`;--> statement-breakpoint
ALTER TABLE `__new_rasPi` RENAME TO `rasPi`;--> statement-breakpoint
CREATE TABLE `__new_tempAndHumidity` (
	`userID` text,
	`type` text NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tempAndHumidity`("userID", "type", "received_at", "value") SELECT "userID", "type", "received_at", "value" FROM `tempAndHumidity`;--> statement-breakpoint
DROP TABLE `tempAndHumidity`;--> statement-breakpoint
ALTER TABLE `__new_tempAndHumidity` RENAME TO `tempAndHumidity`;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`location` text NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "created_at", "location", "email", "first_name", "last_name") SELECT "id", "created_at", "location", "email", "first_name", "last_name" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE TABLE `__new_waterLog` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_instance` text,
	`userID` text,
	`scheduled_time_on_confirm` text NOT NULL,
	`confirmed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`schedule_instance`) REFERENCES `waterSchedule`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_waterLog`("id", "schedule_instance", "userID", "scheduled_time_on_confirm", "confirmed_at") SELECT "id", "schedule_instance", "userID", "scheduled_time_on_confirm", "confirmed_at" FROM `waterLog`;--> statement-breakpoint
DROP TABLE `waterLog`;--> statement-breakpoint
ALTER TABLE `__new_waterLog` RENAME TO `waterLog`;--> statement-breakpoint
CREATE TABLE `__new_zone` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`zone_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`description` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_zone`("id", "user_id", "zone_name", "created_at", "description") SELECT "id", "user_id", "zone_name", "created_at", "description" FROM `zone`;--> statement-breakpoint
DROP TABLE `zone`;--> statement-breakpoint
ALTER TABLE `__new_zone` RENAME TO `zone`;
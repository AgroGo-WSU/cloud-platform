ALTER TABLE `plant` RENAME TO `plantInventory`;--> statement-breakpoint
ALTER TABLE `rasPi` RENAME COLUMN "received_at" TO "created_at";--> statement-breakpoint
CREATE TABLE `fanLog` (
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
CREATE TABLE `fanSchedule` (
	`id` text PRIMARY KEY NOT NULL,
	`userID` text,
	`sensorId` text,
	`scheduled_time_on` text NOT NULL,
	`scheduled_time_off` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sensorId`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pings` (
	`userID` text,
	`sensorId` text,
	`confirmed` text NOT NULL,
	`confirmed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sensorId`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sensors` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`zone_name` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_name`) REFERENCES `zone`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tempAndHumidity` (
	`userID` text,
	`type` text NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `waterLog` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_instance` text,
	`userID` text,
	`scheduled_time_on_confirm` text NOT NULL,
	`confirmed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`schedule_instance`) REFERENCES `waterSchedule`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `waterSchedule` (
	`id` text PRIMARY KEY NOT NULL,
	`userID` text,
	`sensorId` text,
	`scheduled_time` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sensorId`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `automations`;--> statement-breakpoint
DROP TABLE `deviceReadings`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
ALTER TABLE `user` ADD `location` text;
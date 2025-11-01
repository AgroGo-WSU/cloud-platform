DROP TABLE `integrations`;--> statement-breakpoint
DROP TABLE `pings`;--> statement-breakpoint
DROP TABLE `rasPi`;--> statement-breakpoint
DROP TABLE `sensors`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_fanSchedule` (
	`id` text PRIMARY KEY NOT NULL,
	`userID` text,
	`scheduled_time_on` text NOT NULL,
	`scheduled_time_off` text NOT NULL,
	`duration` text,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_fanSchedule`("id", "userID", "scheduled_time_on", "scheduled_time_off", "duration") SELECT "id", "userID", "scheduled_time_on", "scheduled_time_off", "duration" FROM `fanSchedule`;--> statement-breakpoint
DROP TABLE `fanSchedule`;--> statement-breakpoint
ALTER TABLE `__new_fanSchedule` RENAME TO `fanSchedule`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_tempAndHumidity` (
	`userID` text NOT NULL,
	`type` text NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tempAndHumidity`("userID", "type", "received_at", "value") SELECT "userID", "type", "received_at", "value" FROM `tempAndHumidity`;--> statement-breakpoint
DROP TABLE `tempAndHumidity`;--> statement-breakpoint
ALTER TABLE `__new_tempAndHumidity` RENAME TO `tempAndHumidity`;--> statement-breakpoint
CREATE TABLE `__new_waterSchedule` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text,
	`userID` text,
	`scheduled_time` text NOT NULL,
	`duration` text,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_waterSchedule`("id", "type", "userID", "scheduled_time", "duration") SELECT "id", "type", "userID", "scheduled_time", "duration" FROM `waterSchedule`;--> statement-breakpoint
DROP TABLE `waterSchedule`;--> statement-breakpoint
ALTER TABLE `__new_waterSchedule` RENAME TO `waterSchedule`;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`location` text,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`raspi_mac` text,
	`profile_image` text,
	`notifications_for_green_alerts` text DEFAULT 'N',
	`notifications_for_blue_alerts` text DEFAULT 'N',
	`notifications_for_red_alerts` text DEFAULT 'Y'
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "created_at", "location", "email", "first_name", "last_name", "raspi_mac", "profile_image", "notifications_for_green_alerts", "notifications_for_blue_alerts", "notifications_for_red_alerts") SELECT "id", "created_at", "location", "email", "first_name", "last_name", "raspi_mac", "profile_image", "notifications_for_green_alerts", "notifications_for_blue_alerts", "notifications_for_red_alerts" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;
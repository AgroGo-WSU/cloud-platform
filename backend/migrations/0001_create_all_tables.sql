CREATE TABLE `alert` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`severity` text,
	`status` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fanLog` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_instance` text,
	`userID` text,
	`scheduled_time_on_confirm` text NOT NULL,
	`scheduled_time_off_confirm` text NOT NULL,
	`confirmed_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`schedule_instance`) REFERENCES `fanSchedule`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fanSchedule` (
	`id` text PRIMARY KEY NOT NULL,
	`userID` text,
	`sensorID` text,
	`scheduled_time_on` text NOT NULL,
	`scheduled_time_off` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sensorID`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pings` (
	`userID` text,
	`sensorID` text,
	`confirmed` text NOT NULL,
	`confirmed_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sensorID`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plant` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plant_type` text,
	`plant_name` text,
	`zone_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zone`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rasPi` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`status` text DEFAULT 'unpaired' NOT NULL
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
	`received_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`location` text NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `waterLog` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_instance` text,
	`userID` text,
	`scheduled_time_on_confirm` text NOT NULL,
	`confirmed_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`schedule_instance`) REFERENCES `waterSchedule`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `waterSchedule` (
	`id` text PRIMARY KEY NOT NULL,
	`userID` text,
	`sensorID` text,
	`scheduled_time` text NOT NULL,
	FOREIGN KEY (`userID`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sensorID`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `zone` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`zone_name` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`description` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
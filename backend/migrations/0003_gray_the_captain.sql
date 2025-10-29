ALTER TABLE `user` ADD `notifications_for_green_alerts` text DEFAULT 'N';--> statement-breakpoint
ALTER TABLE `user` ADD `notifications_for_blue_alerts` text DEFAULT 'N';--> statement-breakpoint
ALTER TABLE `user` ADD `notifications_for_red_alerts` text DEFAULT 'Y';--> statement-breakpoint
ALTER TABLE `zone` ADD `zone_number` text NOT NULL;
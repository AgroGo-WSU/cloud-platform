PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_zone` (
	`id` text PRIMARY KEY NOT NULL,
	`zone_number` text DEFAULT '1' NOT NULL,
	`user_id` text NOT NULL,
	`zone_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`description` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_zone`("id", "zone_number", "user_id", "zone_name", "created_at", "description") SELECT "id", "zone_number", "user_id", "zone_name", "created_at", "description" FROM `zone`;--> statement-breakpoint
DROP TABLE `zone`;--> statement-breakpoint
ALTER TABLE `__new_zone` RENAME TO `zone`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`raspi_mac` text
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "created_at", "email", "first_name", "last_name", "raspi_mac") SELECT "id", "created_at", "email", "first_name", "last_name", "raspi_mac" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
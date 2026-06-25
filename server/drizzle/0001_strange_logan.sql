PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_UserGroupMap` (
	`groupId` integer,
	`userId` integer,
	FOREIGN KEY (`groupId`) REFERENCES `Users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_UserGroupMap`("groupId", "userId") SELECT "groupId", "userId" FROM `UserGroupMap`;--> statement-breakpoint
DROP TABLE `UserGroupMap`;--> statement-breakpoint
ALTER TABLE `__new_UserGroupMap` RENAME TO `UserGroupMap`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_AuditLog` (
	`userId` integer,
	`action` text,
	`timestamp` integer DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `PortalUsers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_AuditLog`("userId", "action", "timestamp") SELECT "userId", "action", "timestamp" FROM `AuditLog`;--> statement-breakpoint
DROP TABLE `AuditLog`;--> statement-breakpoint
ALTER TABLE `__new_AuditLog` RENAME TO `AuditLog`;--> statement-breakpoint
ALTER TABLE `Permissions` ADD `type` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `Users` ADD `phone` text;
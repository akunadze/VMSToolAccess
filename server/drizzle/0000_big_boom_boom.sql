CREATE TABLE `AccessLog` (
	`toolId` integer,
	`userId` integer,
	`op` text NOT NULL,
	`timestamp` integer,
	`card` text,
	`spindleTime` integer DEFAULT 0,
	FOREIGN KEY (`toolId`) REFERENCES `Tools`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `AuditLog` (
	`userId` integer,
	`action` text,
	`timestamp` integer,
	FOREIGN KEY (`userId`) REFERENCES `PortalUsers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Permissions` (
	`toolId` integer,
	`userId` integer,
	FOREIGN KEY (`toolId`) REFERENCES `Tools`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Permissions_toolId_userId_unique` ON `Permissions` (`toolId`,`userId`);--> statement-breakpoint
CREATE TABLE `PortalUsers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`password` text
);
--> statement-breakpoint
CREATE TABLE `Settings` (
	`Key` text PRIMARY KEY NOT NULL,
	`Value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Tools` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`mac` text,
	`lockedout` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Tools_mac_unique` ON `Tools` (`mac`);--> statement-breakpoint
CREATE TABLE `UserGroupMap` (
	`groupId` integer,
	`userId` integer,
	FOREIGN KEY (`groupId`) REFERENCES `Users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fullName` text NOT NULL,
	`email` text,
	`card` text,
	`doorCard` text,
	`isGroup` integer DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Users_card_unique` ON `Users` (`card`);--> statement-breakpoint
CREATE UNIQUE INDEX `Users_doorCard_unique` ON `Users` (`doorCard`);
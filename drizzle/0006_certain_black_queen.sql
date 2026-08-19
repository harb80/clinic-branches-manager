CREATE TABLE `sync_operations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operationId` varchar(100) NOT NULL,
	`entityType` varchar(60) NOT NULL,
	`entityId` int,
	`branchId` int,
	`originDeviceId` varchar(120) NOT NULL,
	`schemaVersion` int NOT NULL DEFAULT 1,
	`status` enum('pending','accepted','conflict','failed') NOT NULL DEFAULT 'pending',
	`conflictReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sync_operations_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_operations_operationId_unique` UNIQUE(`operationId`)
);

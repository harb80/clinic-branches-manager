ALTER TABLE `appointments` ADD `clientOperationId` varchar(100);--> statement-breakpoint
ALTER TABLE `patients` ADD `clientOperationId` varchar(100);--> statement-breakpoint
ALTER TABLE `payments` ADD `clientOperationId` varchar(100);--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_clientOperationId_unique` UNIQUE(`clientOperationId`);--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_clientOperationId_unique` UNIQUE(`clientOperationId`);--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_clientOperationId_unique` UNIQUE(`clientOperationId`);
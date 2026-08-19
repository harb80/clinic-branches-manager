CREATE TABLE `appointment_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`fromStatus` varchar(30),
	`toStatus` varchar(30) NOT NULL,
	`changedBy` int NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointment_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`branchId` int NOT NULL,
	`doctorId` int NOT NULL,
	`serviceId` int,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`status` enum('booked','confirmed','arrived','completed','cancelled','no_show') NOT NULL DEFAULT 'booked',
	`visitType` enum('new','follow_up','emergency','procedure') NOT NULL DEFAULT 'new',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`branchId` int,
	`action` varchar(80) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branch_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`serviceId` int NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `branch_services_id` PRIMARY KEY(`id`),
	CONSTRAINT `branch_service_unique` UNIQUE(`branchId`,`serviceId`)
);
--> statement-breakpoint
CREATE TABLE `branch_working_hours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`opensAt` varchar(5) NOT NULL,
	`closesAt` varchar(5) NOT NULL,
	`isClosed` boolean NOT NULL DEFAULT false,
	CONSTRAINT `branch_working_hours_id` PRIMARY KEY(`id`),
	CONSTRAINT `branch_day_unique` UNIQUE(`branchId`,`dayOfWeek`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameAr` varchar(180) NOT NULL,
	`nameEn` varchar(180) NOT NULL,
	`code` varchar(32) NOT NULL,
	`address` text,
	`phone` varchar(40),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `doctor_branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`branchId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doctor_branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctor_branch_unique` UNIQUE(`doctorId`,`branchId`)
);
--> statement-breakpoint
CREATE TABLE `doctor_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`branchId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startsAt` varchar(5) NOT NULL,
	`endsAt` varchar(5) NOT NULL,
	`slotMinutes` int NOT NULL DEFAULT 30,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `doctor_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`specialtyId` int NOT NULL,
	`licenseNumber` varchar(80),
	`phone` varchar(40),
	`consultationFee` decimal(12,2) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctors_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(50) NOT NULL,
	`patientId` int NOT NULL,
	`appointmentId` int,
	`branchId` int NOT NULL,
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount` decimal(12,2) NOT NULL DEFAULT '0',
	`total` decimal(12,2) NOT NULL DEFAULT '0',
	`status` enum('unpaid','partial','paid','refunded','cancelled') NOT NULL DEFAULT 'unpaid',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `medical_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int NOT NULL,
	`patientId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(1000) NOT NULL,
	`sizeBytes` int,
	`uploadedBy` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medical_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medical_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int NOT NULL,
	`chiefComplaint` text,
	`diagnosis` text,
	`medications` text,
	`followUpPlan` text,
	`visitNotes` text,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_visits_id` PRIMARY KEY(`id`),
	CONSTRAINT `medical_visits_appointmentId_unique` UNIQUE(`appointmentId`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientNumber` varchar(40) NOT NULL,
	`fullName` varchar(220) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`email` varchar(320),
	`dateOfBirth` timestamp,
	`gender` enum('female','male','other') NOT NULL DEFAULT 'female',
	`address` text,
	`emergencyContact` varchar(160),
	`allergies` text,
	`chronicConditions` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_patientNumber_unique` UNIQUE(`patientNumber`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`patientId` int NOT NULL,
	`branchId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`method` enum('cash','card','bank_transfer','insurance','other') NOT NULL,
	`reference` varchar(120),
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	`receivedBy` int NOT NULL,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameAr` varchar(180) NOT NULL,
	`nameEn` varchar(180) NOT NULL,
	`specialtyId` int,
	`defaultPrice` decimal(12,2) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `specialties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameAr` varchar(160) NOT NULL,
	`nameEn` varchar(160) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `specialties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`branchId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_branch_unique` UNIQUE(`userId`,`branchId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin','branch_manager','doctor','receptionist','accountant') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(120);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
CREATE INDEX `appointments_calendar_idx` ON `appointments` (`branchId`,`doctorId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `doctor_schedule_idx` ON `doctor_schedules` (`doctorId`,`branchId`,`dayOfWeek`);--> statement-breakpoint
CREATE INDEX `visit_attachment_idx` ON `medical_attachments` (`visitId`);--> statement-breakpoint
CREATE INDEX `medical_visits_patient_idx` ON `medical_visits` (`patientId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `patient_search_idx` ON `patients` (`fullName`,`phone`);
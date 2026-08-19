CREATE TABLE `receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptNumber` varchar(60) NOT NULL,
	`invoiceId` int NOT NULL,
	`paymentId` int NOT NULL,
	`patientId` int NOT NULL,
	`branchId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`method` enum('cash','card','bank_transfer','insurance','other') NOT NULL,
	`reference` varchar(120),
	`issuedBy` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `receipts_receiptNumber_unique` UNIQUE(`receiptNumber`),
	CONSTRAINT `receipts_paymentId_unique` UNIQUE(`paymentId`)
);

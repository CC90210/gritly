PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1,
	`unit_price` real NOT NULL,
	`total` real NOT NULL,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_invoice_items`("id", "invoice_id", "description", "quantity", "unit_price", "total", "sort_order") SELECT "id", "invoice_id", "description", "quantity", "unit_price", "total", "sort_order" FROM `invoice_items`;--> statement-breakpoint
DROP TABLE `invoice_items`;--> statement-breakpoint
ALTER TABLE `__new_invoice_items` RENAME TO `invoice_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_id_idx` ON `invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `__new_job_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`org_id` text NOT NULL,
	`visit_number` integer NOT NULL,
	`scheduled_date` text NOT NULL,
	`scheduled_start_time` text,
	`scheduled_end_time` text,
	`actual_start` integer,
	`actual_end` integer,
	`status` text DEFAULT 'scheduled',
	`assigned_to` text DEFAULT '[]',
	`notes` text,
	`photos` text DEFAULT '[]',
	`checklist` text DEFAULT '[]',
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_job_visits`("id", "job_id", "org_id", "visit_number", "scheduled_date", "scheduled_start_time", "scheduled_end_time", "actual_start", "actual_end", "status", "assigned_to", "notes", "photos", "checklist") SELECT "id", "job_id", "org_id", "visit_number", "scheduled_date", "scheduled_start_time", "scheduled_end_time", "actual_start", "actual_end", "status", "assigned_to", "notes", "photos", "checklist" FROM `job_visits`;--> statement-breakpoint
DROP TABLE `job_visits`;--> statement-breakpoint
ALTER TABLE `__new_job_visits` RENAME TO `job_visits`;--> statement-breakpoint
CREATE INDEX `job_visits_org_id_idx` ON `job_visits` (`org_id`);--> statement-breakpoint
CREATE INDEX `job_visits_job_id_idx` ON `job_visits` (`job_id`);--> statement-breakpoint
CREATE INDEX `job_visits_org_date_idx` ON `job_visits` (`org_id`,`scheduled_date`);--> statement-breakpoint
CREATE TABLE `__new_quote_items` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`service_id` text,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1,
	`unit_price` real NOT NULL,
	`total` real NOT NULL,
	`is_optional` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `service_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_quote_items`("id", "quote_id", "service_id", "description", "quantity", "unit_price", "total", "is_optional", "sort_order") SELECT "id", "quote_id", "service_id", "description", "quantity", "unit_price", "total", "is_optional", "sort_order" FROM `quote_items`;--> statement-breakpoint
DROP TABLE `quote_items`;--> statement-breakpoint
ALTER TABLE `__new_quote_items` RENAME TO `quote_items`;--> statement-breakpoint
CREATE INDEX `quote_items_quote_id_idx` ON `quote_items` (`quote_id`);--> statement-breakpoint
ALTER TABLE `organizations` ADD `created_by_email` text;--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_logs_org_entity_idx` ON `audit_logs` (`org_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `clients_user_id_idx` ON `clients` (`user_id`);--> statement-breakpoint
CREATE INDEX `clients_org_user_id_idx` ON `clients` (`org_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `clients_org_email_idx` ON `clients` (`org_id`,`email`);--> statement-breakpoint
CREATE INDEX `invoices_org_status_idx` ON `invoices` (`org_id`,`status`);--> statement-breakpoint
CREATE INDEX `invoices_org_client_idx` ON `invoices` (`org_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `jobs_org_status_idx` ON `jobs` (`org_id`,`status`);--> statement-breakpoint
CREATE INDEX `jobs_org_client_idx` ON `jobs` (`org_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `jobs_quote_id_idx` ON `jobs` (`quote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_stripe_payment_id_udx` ON `payments` (`stripe_payment_id`);--> statement-breakpoint
CREATE INDEX `quotes_org_status_idx` ON `quotes` (`org_id`,`status`);--> statement-breakpoint
CREATE INDEX `quotes_org_client_idx` ON `quotes` (`org_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `review_requests_client_id_idx` ON `review_requests` (`client_id`);--> statement-breakpoint
CREATE INDEX `service_requests_org_status_idx` ON `service_requests` (`org_id`,`status`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `session` (`expiresAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_org_email_udx` ON `team_members` (`org_id`,`email`);--> statement-breakpoint
CREATE INDEX `time_entries_org_member_clock_out_idx` ON `time_entries` (`org_id`,`team_member_id`,`clock_out`);--> statement-breakpoint
CREATE INDEX `time_entries_clock_in_idx` ON `time_entries` (`clock_in`);--> statement-breakpoint
CREATE INDEX `users_org_id_idx` ON `user` (`org_id`);
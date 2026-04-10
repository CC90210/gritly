CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`org_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text DEFAULT '{}',
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_logs_org_id_idx` ON `audit_logs` (`org_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_type_idx` ON `audit_logs` (`entity_type`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_id_idx` ON `audit_logs` (`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	`org_id` text NOT NULL,
	`user_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`company` text,
	`notes` text,
	`tags` text DEFAULT '[]',
	`is_lead` integer DEFAULT false,
	`source` text,
	`stripe_customer_id` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `clients_org_id_idx` ON `clients` (`org_id`);--> statement-breakpoint
CREATE INDEX `clients_email_idx` ON `clients` (`email`);--> statement-breakpoint
CREATE TABLE `communications` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`org_id` text NOT NULL,
	`client_id` text NOT NULL,
	`type` text DEFAULT 'note',
	`direction` text DEFAULT 'outbound',
	`subject` text,
	`body` text NOT NULL,
	`sent_by` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sent_by`) REFERENCES `team_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `communications_org_id_idx` ON `communications` (`org_id`);--> statement-breakpoint
CREATE INDEX `communications_client_id_idx` ON `communications` (`client_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`org_id` text NOT NULL,
	`job_id` text,
	`team_member_id` text,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`receipt_url` text,
	`is_reimbursable` integer DEFAULT false,
	`is_reimbursed` integer DEFAULT false,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_member_id`) REFERENCES `team_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `expenses_org_id_idx` ON `expenses` (`org_id`);--> statement-breakpoint
CREATE INDEX `expenses_job_id_idx` ON `expenses` (`job_id`);--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`quantity` integer DEFAULT 0,
	`min_quantity` integer DEFAULT 0,
	`unit_cost` real,
	`location` text,
	`category` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inventory_items_org_id_idx` ON `inventory_items` (`org_id`);--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1,
	`unit_price` real NOT NULL,
	`total` real NOT NULL,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	`org_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`client_id` text NOT NULL,
	`job_id` text,
	`quote_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`subtotal` real DEFAULT 0,
	`tax_rate` real DEFAULT 0.13,
	`tax_amount` real DEFAULT 0,
	`total` real DEFAULT 0,
	`amount_paid` real DEFAULT 0,
	`due_date` text NOT NULL,
	`paid_at` integer,
	`notes` text,
	`sent_at` integer,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `invoices_org_id_idx` ON `invoices` (`org_id`);--> statement-breakpoint
CREATE INDEX `invoices_client_id_idx` ON `invoices` (`client_id`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `invoices_job_id_idx` ON `invoices` (`job_id`);--> statement-breakpoint
CREATE INDEX `invoices_due_date_idx` ON `invoices` (`due_date`);--> statement-breakpoint
CREATE TABLE `job_visits` (
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
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `job_visits_org_id_idx` ON `job_visits` (`org_id`);--> statement-breakpoint
CREATE INDEX `job_visits_job_id_idx` ON `job_visits` (`job_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	`org_id` text NOT NULL,
	`job_number` text NOT NULL,
	`client_id` text NOT NULL,
	`property_id` text,
	`quote_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'medium',
	`recurrence` text DEFAULT 'once',
	`scheduled_start` integer,
	`scheduled_end` integer,
	`completed_at` integer,
	`assigned_to` text DEFAULT '[]',
	`notes` text,
	`internal_notes` text,
	`total_cost` real DEFAULT 0,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `jobs_org_id_idx` ON `jobs` (`org_id`);--> statement-breakpoint
CREATE INDEX `jobs_client_id_idx` ON `jobs` (`client_id`);--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `jobs_scheduled_start_idx` ON `jobs` (`scheduled_start`);--> statement-breakpoint
CREATE TABLE `maintenance_agreements` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`org_id` text NOT NULL,
	`client_id` text NOT NULL,
	`name` text NOT NULL,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`price` real NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`is_active` integer DEFAULT true,
	`notes` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `maintenance_agreements_org_id_idx` ON `maintenance_agreements` (`org_id`);--> statement-breakpoint
CREATE INDEX `maintenance_agreements_client_id_idx` ON `maintenance_agreements` (`client_id`);--> statement-breakpoint
CREATE TABLE `onboarding_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`step` integer NOT NULL,
	`data` text DEFAULT '{}',
	`updated_at` integer,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`industry` text DEFAULT 'hvac' NOT NULL,
	`plan` text DEFAULT 'starter' NOT NULL,
	`onboarding_completed` integer DEFAULT false,
	`settings` text DEFAULT '{}',
	`stripe_customer_id` text,
	`quote_counter` integer DEFAULT 1000 NOT NULL,
	`job_counter` integer DEFAULT 1000 NOT NULL,
	`invoice_counter` integer DEFAULT 1000 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`org_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`amount` real NOT NULL,
	`method` text DEFAULT 'credit_card',
	`stripe_payment_id` text,
	`notes` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_org_id_idx` ON `payments` (`org_id`);--> statement-breakpoint
CREATE INDEX `payments_invoice_id_idx` ON `payments` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`org_id` text NOT NULL,
	`address_line1` text NOT NULL,
	`address_line2` text,
	`city` text DEFAULT '' NOT NULL,
	`province` text DEFAULT '' NOT NULL,
	`postal_code` text,
	`notes` text,
	`lat` real,
	`lng` real,
	`is_primary` integer DEFAULT true,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `properties_org_id_idx` ON `properties` (`org_id`);--> statement-breakpoint
CREATE INDEX `properties_client_id_idx` ON `properties` (`client_id`);--> statement-breakpoint
CREATE TABLE `quote_items` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`service_id` text,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1,
	`unit_price` real NOT NULL,
	`total` real NOT NULL,
	`is_optional` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `service_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	`org_id` text NOT NULL,
	`quote_number` text NOT NULL,
	`client_id` text NOT NULL,
	`property_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`subtotal` real DEFAULT 0,
	`tax_rate` real DEFAULT 0.13,
	`tax_amount` real DEFAULT 0,
	`total` real DEFAULT 0,
	`deposit_required` real DEFAULT 0,
	`notes` text,
	`valid_until` text,
	`approved_at` integer,
	`sent_at` integer,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `quotes_org_id_idx` ON `quotes` (`org_id`);--> statement-breakpoint
CREATE INDEX `quotes_client_id_idx` ON `quotes` (`client_id`);--> statement-breakpoint
CREATE INDEX `quotes_status_idx` ON `quotes` (`status`);--> statement-breakpoint
CREATE TABLE `review_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`org_id` text NOT NULL,
	`client_id` text NOT NULL,
	`job_id` text,
	`sent_via` text DEFAULT 'email',
	`status` text DEFAULT 'pending',
	`review_url` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_requests_org_id_idx` ON `review_requests` (`org_id`);--> statement-breakpoint
CREATE INDEX `review_requests_job_id_idx` ON `review_requests` (`job_id`);--> statement-breakpoint
CREATE TABLE `service_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`default_price` real,
	`unit` text DEFAULT 'each',
	`category` text,
	`is_active` integer DEFAULT true,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `service_items_org_id_idx` ON `service_items` (`org_id`);--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	`org_id` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`service_type` text NOT NULL,
	`description` text NOT NULL,
	`address` text,
	`preferred_date` text,
	`preferred_time` text,
	`source` text DEFAULT 'website',
	`converted_to_client_id` text,
	`converted_to_quote_id` text,
	`notes` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`converted_to_client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`converted_to_quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `service_requests_org_id_idx` ON `service_requests` (`org_id`);--> statement-breakpoint
CREATE INDEX `service_requests_status_idx` ON `service_requests` (`status`);--> statement-breakpoint
CREATE INDEX `service_requests_email_idx` ON `service_requests` (`email`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer,
	`org_id` text NOT NULL,
	`user_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`role` text DEFAULT 'technician',
	`hourly_rate` real,
	`color` text DEFAULT '#f97316',
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `team_members_org_id_idx` ON `team_members` (`org_id`);--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`team_member_id` text NOT NULL,
	`job_id` text,
	`visit_id` text,
	`clock_in` integer NOT NULL,
	`clock_out` integer,
	`duration_minutes` integer,
	`notes` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_member_id`) REFERENCES `team_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `job_visits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `time_entries_org_id_idx` ON `time_entries` (`org_id`);--> statement-breakpoint
CREATE INDEX `time_entries_job_id_idx` ON `time_entries` (`job_id`);--> statement-breakpoint
CREATE INDEX `time_entries_team_member_id_idx` ON `time_entries` (`team_member_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false,
	`image` text,
	`createdAt` integer,
	`updatedAt` integer,
	`org_id` text,
	`role` text DEFAULT 'owner' NOT NULL,
	`phone` text,
	`first_name` text,
	`last_name` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);

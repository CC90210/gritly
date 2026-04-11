import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================
// ORGANIZATIONS (multi-tenant root)
// ============================================================

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdByEmail: text("created_by_email"),
  industry: text("industry").notNull().default("hvac"),
  plan: text("plan").notNull().default("starter"),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(false),
  settings: text("settings", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  stripeCustomerId: text("stripe_customer_id"),
  quoteCounter: integer("quote_counter").notNull().default(1000),
  jobCounter: integer("job_counter").notNull().default(1000),
  invoiceCounter: integer("invoice_counter").notNull().default(1000),
});

// ============================================================
// USERS (better-auth manages user + session tables, but we
// extend with org linkage and role)
// ============================================================

export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  // Gritly extensions
  orgId: text("org_id").references(() => organizations.id),
  role: text("role").notNull().default("owner"),
  phone: text("phone"),
  firstName: text("first_name"),
  lastName: text("last_name"),
});

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => users.id),
});

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => users.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const verifications = sqliteTable("verification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ============================================================
// ONBOARDING RESPONSES
// ============================================================

export const onboardingResponses = sqliteTable("onboarding_responses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  step: integer("step").notNull(),
  data: text("data", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ============================================================
// CLIENTS (CRM)
// ============================================================

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  notes: text("notes"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  isLead: integer("is_lead", { mode: "boolean" }).default(false),
  source: text("source"),
  stripeCustomerId: text("stripe_customer_id"),
}, (t) => [
  index("clients_org_id_idx").on(t.orgId),
  index("clients_email_idx").on(t.email),
]);

// ============================================================
// PROPERTIES
// ============================================================

export const properties = sqliteTable("properties", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text("client_id").notNull().references(() => clients.id),
  orgId: text("org_id").notNull().references(() => organizations.id),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull().default(""),
  province: text("province").notNull().default(""),
  postalCode: text("postal_code"),
  notes: text("notes"),
  lat: real("lat"),
  lng: real("lng"),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(true),
}, (t) => [
  index("properties_org_id_idx").on(t.orgId),
  index("properties_client_id_idx").on(t.clientId),
]);

// ============================================================
// SERVICE ITEMS (Pricebook)
// ============================================================

export const serviceItems = sqliteTable("service_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  defaultPrice: real("default_price"),
  unit: text("unit").default("each"),
  category: text("category"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  sortOrder: integer("sort_order").default(0),
}, (t) => [
  index("service_items_org_id_idx").on(t.orgId),
]);

// ============================================================
// QUOTES
// ============================================================

export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  quoteNumber: text("quote_number").notNull(),
  clientId: text("client_id").notNull().references(() => clients.id),
  propertyId: text("property_id").references(() => properties.id),
  status: text("status").notNull().default("draft"),
  subtotal: real("subtotal").default(0),
  taxRate: real("tax_rate").default(0.13),
  taxAmount: real("tax_amount").default(0),
  total: real("total").default(0),
  depositRequired: real("deposit_required").default(0),
  notes: text("notes"),
  validUntil: text("valid_until"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  sentAt: integer("sent_at", { mode: "timestamp" }),
}, (t) => [
  index("quotes_org_id_idx").on(t.orgId),
  index("quotes_client_id_idx").on(t.clientId),
  index("quotes_status_idx").on(t.status),
]);

export const quoteItems = sqliteTable("quote_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  quoteId: text("quote_id").notNull().references(() => quotes.id),
  serviceId: text("service_id").references(() => serviceItems.id),
  description: text("description").notNull(),
  quantity: real("quantity").default(1),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
  isOptional: integer("is_optional", { mode: "boolean" }).default(false),
  sortOrder: integer("sort_order").default(0),
});

// ============================================================
// TEAM MEMBERS
// ============================================================

export const teamMembers = sqliteTable("team_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").default("technician"),
  hourlyRate: real("hourly_rate"),
  color: text("color").default("#f97316"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
}, (t) => [
  index("team_members_org_id_idx").on(t.orgId),
]);

// ============================================================
// JOBS
// ============================================================

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  jobNumber: text("job_number").notNull(),
  clientId: text("client_id").notNull().references(() => clients.id),
  propertyId: text("property_id").references(() => properties.id),
  quoteId: text("quote_id").references(() => quotes.id),
  status: text("status").notNull().default("pending"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("medium"),
  recurrence: text("recurrence").default("once"),
  scheduledStart: integer("scheduled_start", { mode: "timestamp" }),
  scheduledEnd: integer("scheduled_end", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  assignedTo: text("assigned_to", { mode: "json" }).$type<string[]>().default([]),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  totalCost: real("total_cost").default(0),
}, (t) => [
  index("jobs_org_id_idx").on(t.orgId),
  index("jobs_client_id_idx").on(t.clientId),
  index("jobs_status_idx").on(t.status),
  index("jobs_scheduled_start_idx").on(t.scheduledStart),
]);

// ============================================================
// JOB VISITS
// ============================================================

export const jobVisits = sqliteTable("job_visits", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => jobs.id),
  orgId: text("org_id").notNull().references(() => organizations.id),
  visitNumber: integer("visit_number").notNull(),
  scheduledDate: text("scheduled_date").notNull(),
  scheduledStartTime: text("scheduled_start_time"),
  scheduledEndTime: text("scheduled_end_time"),
  actualStart: integer("actual_start", { mode: "timestamp" }),
  actualEnd: integer("actual_end", { mode: "timestamp" }),
  status: text("status").default("scheduled"),
  assignedTo: text("assigned_to", { mode: "json" }).$type<string[]>().default([]),
  notes: text("notes"),
  photos: text("photos", { mode: "json" }).$type<string[]>().default([]),
  checklist: text("checklist", { mode: "json" }).$type<{ item: string; completed: boolean }[]>().default([]),
}, (t) => [
  index("job_visits_org_id_idx").on(t.orgId),
  index("job_visits_job_id_idx").on(t.jobId),
]);

// ============================================================
// INVOICES
// ============================================================

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  invoiceNumber: text("invoice_number").notNull(),
  clientId: text("client_id").notNull().references(() => clients.id),
  jobId: text("job_id").references(() => jobs.id),
  quoteId: text("quote_id").references(() => quotes.id),
  status: text("status").notNull().default("draft"),
  subtotal: real("subtotal").default(0),
  taxRate: real("tax_rate").default(0.13),
  taxAmount: real("tax_amount").default(0),
  total: real("total").default(0),
  amountPaid: real("amount_paid").default(0),
  dueDate: text("due_date").notNull(),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  notes: text("notes"),
  sentAt: integer("sent_at", { mode: "timestamp" }),
}, (t) => [
  index("invoices_org_id_idx").on(t.orgId),
  index("invoices_client_id_idx").on(t.clientId),
  index("invoices_status_idx").on(t.status),
  index("invoices_job_id_idx").on(t.jobId),
  index("invoices_due_date_idx").on(t.dueDate),
]);

export const invoiceItems = sqliteTable("invoice_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id),
  description: text("description").notNull(),
  quantity: real("quantity").default(1),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
  sortOrder: integer("sort_order").default(0),
});

// ============================================================
// PAYMENTS
// ============================================================

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id),
  amount: real("amount").notNull(),
  method: text("method").default("credit_card"),
  stripePaymentId: text("stripe_payment_id"),
  notes: text("notes"),
}, (t) => [
  index("payments_org_id_idx").on(t.orgId),
  index("payments_invoice_id_idx").on(t.invoiceId),
]);

// ============================================================
// TIME ENTRIES
// ============================================================

export const timeEntries = sqliteTable("time_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  teamMemberId: text("team_member_id").notNull().references(() => teamMembers.id),
  jobId: text("job_id").references(() => jobs.id),
  visitId: text("visit_id").references(() => jobVisits.id),
  clockIn: integer("clock_in", { mode: "timestamp" }).notNull(),
  clockOut: integer("clock_out", { mode: "timestamp" }),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
}, (t) => [
  index("time_entries_org_id_idx").on(t.orgId),
  index("time_entries_job_id_idx").on(t.jobId),
  index("time_entries_team_member_id_idx").on(t.teamMemberId),
]);

// ============================================================
// EXPENSES
// ============================================================

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  jobId: text("job_id").references(() => jobs.id),
  teamMemberId: text("team_member_id").references(() => teamMembers.id),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  receiptUrl: text("receipt_url"),
  isReimbursable: integer("is_reimbursable", { mode: "boolean" }).default(false),
  isReimbursed: integer("is_reimbursed", { mode: "boolean" }).default(false),
}, (t) => [
  index("expenses_org_id_idx").on(t.orgId),
  index("expenses_job_id_idx").on(t.jobId),
]);

// ============================================================
// SERVICE REQUESTS (from public booking widget)
// ============================================================

export const serviceRequests = sqliteTable("service_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  status: text("status").notNull().default("new"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  serviceType: text("service_type").notNull(),
  description: text("description").notNull(),
  address: text("address"),
  preferredDate: text("preferred_date"),
  preferredTime: text("preferred_time"),
  source: text("source").default("website"),
  convertedToClientId: text("converted_to_client_id").references(() => clients.id),
  convertedToQuoteId: text("converted_to_quote_id").references(() => quotes.id),
  notes: text("notes"),
}, (t) => [
  index("service_requests_org_id_idx").on(t.orgId),
  index("service_requests_status_idx").on(t.status),
  index("service_requests_email_idx").on(t.email),
]);

// ============================================================
// COMMUNICATIONS LOG
// ============================================================

export const communications = sqliteTable("communications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  clientId: text("client_id").notNull().references(() => clients.id),
  type: text("type").default("note"),
  direction: text("direction").default("outbound"),
  subject: text("subject"),
  body: text("body").notNull(),
  sentBy: text("sent_by").references(() => teamMembers.id),
}, (t) => [
  index("communications_org_id_idx").on(t.orgId),
  index("communications_client_id_idx").on(t.clientId),
]);

// ============================================================
// INVENTORY
// ============================================================

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  sku: text("sku"),
  quantity: integer("quantity").default(0),
  minQuantity: integer("min_quantity").default(0),
  unitCost: real("unit_cost"),
  location: text("location"),
  category: text("category"),
}, (t) => [
  index("inventory_items_org_id_idx").on(t.orgId),
]);

// ============================================================
// MAINTENANCE AGREEMENTS
// ============================================================

export const maintenanceAgreements = sqliteTable("maintenance_agreements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  clientId: text("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  price: real("price").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  notes: text("notes"),
}, (t) => [
  index("maintenance_agreements_org_id_idx").on(t.orgId),
  index("maintenance_agreements_client_id_idx").on(t.clientId),
]);

// ============================================================
// REVIEW REQUESTS
// ============================================================

export const reviewRequests = sqliteTable("review_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  clientId: text("client_id").notNull().references(() => clients.id),
  jobId: text("job_id").references(() => jobs.id),
  sentVia: text("sent_via").default("email"),
  status: text("status").default("pending"),
  reviewUrl: text("review_url"),
}, (t) => [
  index("review_requests_org_id_idx").on(t.orgId),
  index("review_requests_job_id_idx").on(t.jobId),
]);

// ============================================================
// AUDIT LOGS
// ============================================================

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  action: text("action").notNull(), // create | update | delete
  entityType: text("entity_type").notNull(), // client | quote | job | invoice | etc.
  entityId: text("entity_id").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().default({}),
}, (t) => [
  index("audit_logs_org_id_idx").on(t.orgId),
  index("audit_logs_entity_type_idx").on(t.entityType),
  index("audit_logs_entity_id_idx").on(t.entityId),
  index("audit_logs_created_at_idx").on(t.createdAt),
]);

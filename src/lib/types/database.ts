import type { IndustrySlug } from "@/lib/constants/brand";

// ─── Shared primitives ──────────────────────────────────────────────────────

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "dispatcher"
  | "technician"
  | "client";

export type Plan = "starter" | "pro" | "business";

export type JobStatus =
  | "unscheduled"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "on_hold";

export type QuoteStatus =
  | "draft"
  | "sent"
  | "approved"
  | "declined"
  | "expired"
  | "converted";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partial"
  | "paid"
  | "overdue"
  | "void";

export type PaymentMethod =
  | "card"
  | "ach"
  | "cash"
  | "check"
  | "financing"
  | "other";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type CommunicationType =
  | "email"
  | "sms"
  | "call"
  | "note"
  | "portal_message";

export type ServiceRequestStatus =
  | "new"
  | "reviewing"
  | "scheduled"
  | "declined";

export type MaintenanceAgreementStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "expired";

// ─── Organization ────────────────────────────────────────────────────────────

export interface OrgSettings {
  timezone: string;
  currency: string;
  dateFormat: string;
  taxRate: number;
  taxName: string;
  invoicePrefix: string;
  quotePrefix: string;
  jobPrefix: string;
  portalEnabled: boolean;
  bookingWidgetEnabled: boolean;
  autoSendInvoices: boolean;
  autoSendQuoteReminders: boolean;
  reviewRequestDelay: number; // hours after job completion
  notificationEmails: string[];
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  phone: string | null;
  website: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: IndustrySlug;
  onboarding_completed: boolean;
  settings: OrgSettings;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  created_at: string;
  updated_at: string;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string; // matches auth.users.id
  org_id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Client (CRM contact) ────────────────────────────────────────────────────

export interface Client {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  billing_country: string | null;
  notes: string | null;
  tags: string[];
  lead_source: string | null;
  portal_access: boolean;
  portal_user_id: string | null; // auth.users.id for portal login
  created_at: string;
  updated_at: string;
}

// ─── Property ────────────────────────────────────────────────────────────────

export interface Property {
  id: string;
  org_id: string;
  client_id: string;
  name: string | null; // e.g. "Main Office", "Rental Unit"
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  notes: string | null;
  access_instructions: string | null;
  gate_code: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Service Item (Pricebook) ─────────────────────────────────────────────────

export interface ServiceItem {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: number;
  cost: number | null; // for job costing
  unit: string; // "each", "hour", "sqft", etc.
  taxable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export interface Quote {
  id: string;
  org_id: string;
  client_id: string;
  property_id: string | null;
  quote_number: string; // e.g. "Q-0042"
  status: QuoteStatus;
  title: string | null;
  message: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  valid_until: string | null;
  sent_at: string | null;
  approved_at: string | null;
  declined_at: string | null;
  converted_to_job_id: string | null;
  notes: string | null;
  created_by: string; // profile.id
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  id: string;
  org_id: string;
  quote_id: string;
  service_item_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  taxable: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Job ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  org_id: string;
  client_id: string;
  property_id: string | null;
  quote_id: string | null;
  job_number: string; // e.g. "J-0142"
  title: string;
  description: string | null;
  status: JobStatus;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  assigned_to: string[]; // profile.id[]
  instructions: string | null;
  internal_notes: string | null;
  custom_fields: Record<string, unknown>;
  is_recurring: boolean;
  recurrence_rule: string | null; // RFC 5545 RRULE
  parent_job_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JobVisit {
  id: string;
  org_id: string;
  job_id: string;
  technician_id: string; // profile.id
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  org_id: string;
  client_id: string;
  job_id: string | null;
  quote_id: string | null;
  invoice_number: string; // e.g. "INV-0201"
  status: InvoiceStatus;
  title: string | null;
  message: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  org_id: string;
  invoice_id: string;
  service_item_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  taxable: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  org_id: string;
  invoice_id: string;
  client_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null; // cheque number, transaction ID, etc.
  stripe_payment_intent_id: string | null;
  notes: string | null;
  paid_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  org_id: string;
  profile_id: string;
  title: string | null;
  hourly_rate: number | null;
  color: string | null; // calendar color for this tech
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  org_id: string;
  job_id: string | null;
  team_member_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  org_id: string;
  job_id: string | null;
  team_member_id: string | null;
  description: string;
  amount: number;
  category: string | null;
  receipt_url: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

// ─── Service Request (booking widget) ────────────────────────────────────────

export interface ServiceRequest {
  id: string;
  org_id: string;
  client_id: string | null; // null if guest request
  status: ServiceRequestStatus;
  name: string;
  email: string | null;
  phone: string | null;
  service_type: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  address: string | null;
  converted_to_job_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Communication ────────────────────────────────────────────────────────────

export interface Communication {
  id: string;
  org_id: string;
  client_id: string;
  job_id: string | null;
  invoice_id: string | null;
  type: CommunicationType;
  direction: "inbound" | "outbound";
  subject: string | null;
  body: string;
  sent_by: string | null; // profile.id
  sent_at: string;
  created_at: string;
}

// ─── GPS Track ────────────────────────────────────────────────────────────────

export interface GpsTrack {
  id: string;
  org_id: string;
  team_member_id: string;
  job_id: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  recorded_at: string;
  created_at: string;
}

// ─── App Settings (per-org key-value store) ───────────────────────────────────

export interface AppSettings {
  id: string;
  org_id: string;
  key: string;
  value: string; // JSON-stringified
  created_at: string;
  updated_at: string;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardingData {
  id: string;
  org_id: string;
  step: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Job Form Templates (custom checklists) ───────────────────────────────────

export interface JobFormTemplate {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  fields: JobFormField[];
  industry_tag: IndustrySlug | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobFormField {
  id: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "date" | "photo" | "signature";
  required: boolean;
  options?: string[]; // for select type
  placeholder?: string;
}

export interface JobFormSubmission {
  id: string;
  org_id: string;
  job_id: string;
  template_id: string;
  technician_id: string;
  answers: Record<string, unknown>;
  submitted_at: string;
  created_at: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  org_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string;
  cost: number | null;
  reorder_point: number | null;
  quantity_on_hand: number;
  location: string | null; // e.g. "Truck 1", "Warehouse"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  org_id: string;
  inventory_item_id: string;
  job_id: string | null;
  type: "in" | "out" | "adjustment";
  quantity: number;
  notes: string | null;
  created_by: string;
  created_at: string;
}

// ─── Review Requests ─────────────────────────────────────────────────────────

export interface ReviewRequest {
  id: string;
  org_id: string;
  job_id: string;
  client_id: string;
  platform: "google" | "facebook" | "other";
  status: "pending" | "sent" | "clicked" | "reviewed";
  sent_at: string | null;
  clicked_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Maintenance Agreements ───────────────────────────────────────────────────

export interface MaintenanceAgreement {
  id: string;
  org_id: string;
  client_id: string;
  property_id: string | null;
  name: string;
  description: string | null;
  status: MaintenanceAgreementStatus;
  billing_cycle: "monthly" | "quarterly" | "annually";
  amount: number;
  visits_per_cycle: number;
  next_billing_date: string | null;
  next_visit_date: string | null;
  start_date: string;
  end_date: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Database type (for createClient generic) ─────────────────────────────────

// Supabase-compatible table descriptor.
// Insert: all fields optional (Partial) so callers only supply what they set;
// DB-generated fields (id, timestamps) are omitted to match Supabase's Insert pattern.
type Table<T> = {
  Row: T;
  Insert: Partial<Omit<T, "id" | "created_at" | "updated_at">>;
  Update: Partial<T>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      organizations: Table<Organization>;
      profiles: Table<Profile>;
      clients: Table<Client>;
      properties: Table<Property>;
      service_items: Table<ServiceItem>;
      quotes: Table<Quote>;
      quote_items: Table<QuoteItem>;
      jobs: Table<Job>;
      job_visits: Table<JobVisit>;
      invoices: Table<Invoice>;
      invoice_items: Table<InvoiceItem>;
      payments: Table<Payment>;
      team_members: Table<TeamMember>;
      time_entries: Table<TimeEntry>;
      expenses: Table<Expense>;
      service_requests: Table<ServiceRequest>;
      communications: Table<Communication>;
      gps_tracks: Table<GpsTrack>;
      app_settings: Table<AppSettings>;
      onboarding_responses: Table<OnboardingData>;
      job_form_templates: Table<JobFormTemplate>;
      job_form_submissions: Table<JobFormSubmission>;
      inventory_items: Table<InventoryItem>;
      inventory_transactions: Table<InventoryTransaction>;
      review_requests: Table<ReviewRequest>;
      maintenance_agreements: Table<MaintenanceAgreement>;
    };
    Views: Record<string, never>;
    Functions: Record<string, unknown>;
    Enums: Record<string, never>;
  };
}

-- ============================================================
-- Gritly Multi-Tenant Schema — Migration 001
-- Every table is scoped by org_id. RLS enforces tenant isolation.
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Helper: updated_at trigger ───────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Organizations ─────────────────────────────────────────────────────────────

create table public.organizations (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  slug                  text not null unique,
  industry              text not null,
  onboarding_completed  boolean not null default false,
  settings              jsonb not null default '{
    "timezone": "America/Toronto",
    "currency": "CAD",
    "dateFormat": "MMM d, yyyy",
    "taxRate": 0,
    "taxName": "Tax",
    "invoicePrefix": "INV-",
    "quotePrefix": "Q-",
    "jobPrefix": "J-",
    "portalEnabled": false,
    "bookingWidgetEnabled": false,
    "autoSendInvoices": false,
    "autoSendQuoteReminders": true,
    "reviewRequestDelay": 2,
    "notificationEmails": [],
    "logoUrl": null,
    "address": null,
    "city": null,
    "state": null,
    "zip": null,
    "country": "CA",
    "phone": null,
    "website": null
  }'::jsonb,
  stripe_customer_id        text unique,
  stripe_subscription_id    text unique,
  plan                      text not null default 'starter' check (plan in ('starter', 'pro', 'business')),
  -- Per-org sequence counters (avoids global sequences, fully tenant-scoped)
  invoice_counter           integer not null default 0,
  quote_counter             integer not null default 0,
  job_counter               integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function set_updated_at();

-- ─── Profiles ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  role        text not null default 'technician'
                check (role in ('owner','admin','manager','dispatcher','technician','client')),
  first_name  text not null default '',
  last_name   text not null default '',
  email       text not null,
  phone       text,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_profiles_org on public.profiles(org_id);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function set_updated_at();

-- Auto-create profile when a new user registers
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_role   text;
begin
  v_org_id := (new.raw_user_meta_data->>'org_id')::uuid;
  v_role   := coalesce(new.raw_user_meta_data->>'role', 'technician');

  if v_org_id is not null then
    insert into public.profiles (id, org_id, role, first_name, last_name, email)
    values (
      new.id,
      v_org_id,
      v_role,
      coalesce(new.raw_user_meta_data->>'first_name', ''),
      coalesce(new.raw_user_meta_data->>'last_name', ''),
      new.email
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Auto-numbering (per-org scoped) ──────────────────────────────────────────

create or replace function public.next_invoice_number(p_org_id uuid)
returns text language plpgsql security definer as $$
declare
  v_counter integer;
  v_prefix  text;
begin
  update public.organizations
  set    invoice_counter = invoice_counter + 1
  where  id = p_org_id
  returning invoice_counter, settings->>'invoicePrefix'
  into   v_counter, v_prefix;

  return coalesce(v_prefix, 'INV-') || lpad(v_counter::text, 4, '0');
end;
$$;

create or replace function public.next_quote_number(p_org_id uuid)
returns text language plpgsql security definer as $$
declare
  v_counter integer;
  v_prefix  text;
begin
  update public.organizations
  set    quote_counter = quote_counter + 1
  where  id = p_org_id
  returning quote_counter, settings->>'quotePrefix'
  into   v_counter, v_prefix;

  return coalesce(v_prefix, 'Q-') || lpad(v_counter::text, 4, '0');
end;
$$;

create or replace function public.next_job_number(p_org_id uuid)
returns text language plpgsql security definer as $$
declare
  v_counter integer;
  v_prefix  text;
begin
  update public.organizations
  set    job_counter = job_counter + 1
  where  id = p_org_id
  returning job_counter, settings->>'jobPrefix'
  into   v_counter, v_prefix;

  return coalesce(v_prefix, 'J-') || lpad(v_counter::text, 4, '0');
end;
$$;

-- ─── Clients ───────────────────────────────────────────────────────────────────

create table public.clients (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  first_name       text not null default '',
  last_name        text not null default '',
  company_name     text,
  email            text,
  phone            text,
  alt_phone        text,
  billing_address  text,
  billing_city     text,
  billing_state    text,
  billing_zip      text,
  billing_country  text,
  notes            text,
  tags             text[] not null default '{}',
  lead_source      text,
  portal_access    boolean not null default false,
  portal_user_id   uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_clients_org on public.clients(org_id);
create index idx_clients_email on public.clients(org_id, email);

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function set_updated_at();

-- ─── Properties ────────────────────────────────────────────────────────────────

create table public.properties (
  id                    uuid primary key default uuid_generate_v4(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  client_id             uuid not null references public.clients(id) on delete cascade,
  name                  text,
  address               text not null,
  city                  text not null,
  state                 text not null,
  zip                   text not null,
  country               text not null default 'CA',
  notes                 text,
  access_instructions   text,
  gate_code             text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_properties_org on public.properties(org_id);
create index idx_properties_client on public.properties(client_id);

create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function set_updated_at();

-- ─── Service Items (Pricebook) ─────────────────────────────────────────────────

create table public.service_items (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  name         text not null,
  description  text,
  category     text,
  unit_price   numeric(10,2) not null default 0,
  cost         numeric(10,2),
  unit         text not null default 'each',
  taxable      boolean not null default true,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_service_items_org on public.service_items(org_id);

create trigger trg_service_items_updated_at
  before update on public.service_items
  for each row execute function set_updated_at();

-- ─── Quotes ────────────────────────────────────────────────────────────────────

create table public.quotes (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  client_id           uuid not null references public.clients(id) on delete restrict,
  property_id         uuid references public.properties(id) on delete set null,
  quote_number        text not null,
  status              text not null default 'draft'
                        check (status in ('draft','sent','approved','declined','expired','converted')),
  title               text,
  message             text,
  subtotal            numeric(10,2) not null default 0,
  tax_rate            numeric(5,4) not null default 0,
  tax_amount          numeric(10,2) not null default 0,
  discount_amount     numeric(10,2) not null default 0,
  total               numeric(10,2) not null default 0,
  valid_until         date,
  sent_at             timestamptz,
  approved_at         timestamptz,
  declined_at         timestamptz,
  converted_to_job_id uuid,
  notes               text,
  created_by          uuid not null references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, quote_number)
);

create index idx_quotes_org on public.quotes(org_id);
create index idx_quotes_client on public.quotes(org_id, client_id);
create index idx_quotes_status on public.quotes(org_id, status);

create trigger trg_quotes_updated_at
  before update on public.quotes
  for each row execute function set_updated_at();

create table public.quote_items (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  quote_id         uuid not null references public.quotes(id) on delete cascade,
  service_item_id  uuid references public.service_items(id) on delete set null,
  name             text not null,
  description      text,
  quantity         numeric(10,3) not null default 1,
  unit_price       numeric(10,2) not null default 0,
  taxable          boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_quote_items_quote on public.quote_items(quote_id);

create trigger trg_quote_items_updated_at
  before update on public.quote_items
  for each row execute function set_updated_at();

-- ─── Jobs ──────────────────────────────────────────────────────────────────────

create table public.jobs (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete restrict,
  property_id      uuid references public.properties(id) on delete set null,
  quote_id         uuid references public.quotes(id) on delete set null,
  job_number       text not null,
  title            text not null,
  description      text,
  status           text not null default 'unscheduled'
                     check (status in ('unscheduled','scheduled','in_progress','completed','cancelled','on_hold')),
  scheduled_start  timestamptz,
  scheduled_end    timestamptz,
  actual_start     timestamptz,
  actual_end       timestamptz,
  assigned_to      uuid[] not null default '{}',
  instructions     text,
  internal_notes   text,
  custom_fields    jsonb not null default '{}',
  is_recurring     boolean not null default false,
  recurrence_rule  text,
  parent_job_id    uuid references public.jobs(id) on delete set null,
  created_by       uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (org_id, job_number)
);

create index idx_jobs_org on public.jobs(org_id);
create index idx_jobs_client on public.jobs(org_id, client_id);
create index idx_jobs_status on public.jobs(org_id, status);
create index idx_jobs_scheduled on public.jobs(org_id, scheduled_start);

create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute function set_updated_at();

create table public.job_visits (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  job_id           uuid not null references public.jobs(id) on delete cascade,
  technician_id    uuid not null references public.profiles(id),
  check_in_at      timestamptz,
  check_out_at     timestamptz,
  check_in_lat     double precision,
  check_in_lng     double precision,
  check_out_lat    double precision,
  check_out_lng    double precision,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_job_visits_job on public.job_visits(job_id);

create trigger trg_job_visits_updated_at
  before update on public.job_visits
  for each row execute function set_updated_at();

-- ─── Invoices ──────────────────────────────────────────────────────────────────

create table public.invoices (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete restrict,
  job_id           uuid references public.jobs(id) on delete set null,
  quote_id         uuid references public.quotes(id) on delete set null,
  invoice_number   text not null,
  status           text not null default 'draft'
                     check (status in ('draft','sent','partial','paid','overdue','void')),
  title            text,
  message          text,
  subtotal         numeric(10,2) not null default 0,
  tax_rate         numeric(5,4) not null default 0,
  tax_amount       numeric(10,2) not null default 0,
  discount_amount  numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  amount_paid      numeric(10,2) not null default 0,
  balance_due      numeric(10,2) generated always as (total - amount_paid) stored,
  due_date         date,
  sent_at          timestamptz,
  paid_at          timestamptz,
  notes            text,
  created_by       uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (org_id, invoice_number)
);

create index idx_invoices_org on public.invoices(org_id);
create index idx_invoices_client on public.invoices(org_id, client_id);
create index idx_invoices_status on public.invoices(org_id, status);

create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function set_updated_at();

create table public.invoice_items (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  invoice_id       uuid not null references public.invoices(id) on delete cascade,
  service_item_id  uuid references public.service_items(id) on delete set null,
  name             text not null,
  description      text,
  quantity         numeric(10,3) not null default 1,
  unit_price       numeric(10,2) not null default 0,
  taxable          boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_invoice_items_invoice on public.invoice_items(invoice_id);

create trigger trg_invoice_items_updated_at
  before update on public.invoice_items
  for each row execute function set_updated_at();

create table public.payments (
  id                          uuid primary key default uuid_generate_v4(),
  org_id                      uuid not null references public.organizations(id) on delete cascade,
  invoice_id                  uuid not null references public.invoices(id) on delete restrict,
  client_id                   uuid not null references public.clients(id) on delete restrict,
  amount                      numeric(10,2) not null,
  method                      text not null default 'card'
                                check (method in ('card','ach','cash','check','financing','other')),
  status                      text not null default 'completed'
                                check (status in ('pending','completed','failed','refunded')),
  reference                   text,
  stripe_payment_intent_id    text unique,
  notes                       text,
  paid_at                     timestamptz not null default now(),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index idx_payments_org on public.payments(org_id);
create index idx_payments_invoice on public.payments(invoice_id);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function set_updated_at();

-- ─── Team Members ──────────────────────────────────────────────────────────────

create table public.team_members (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  title       text,
  hourly_rate numeric(10,2),
  color       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, profile_id)
);

create index idx_team_members_org on public.team_members(org_id);

create trigger trg_team_members_updated_at
  before update on public.team_members
  for each row execute function set_updated_at();

create table public.time_entries (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  job_id           uuid references public.jobs(id) on delete set null,
  team_member_id   uuid not null references public.team_members(id) on delete restrict,
  started_at       timestamptz not null,
  ended_at         timestamptz,
  duration_minutes integer generated always as (
    case when ended_at is not null
      then extract(epoch from (ended_at - started_at))::integer / 60
      else null
    end
  ) stored,
  notes            text,
  is_billable      boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_time_entries_org on public.time_entries(org_id);
create index idx_time_entries_job on public.time_entries(job_id);

create trigger trg_time_entries_updated_at
  before update on public.time_entries
  for each row execute function set_updated_at();

-- ─── Expenses ──────────────────────────────────────────────────────────────────

create table public.expenses (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  job_id           uuid references public.jobs(id) on delete set null,
  team_member_id   uuid references public.team_members(id) on delete set null,
  description      text not null,
  amount           numeric(10,2) not null,
  category         text,
  receipt_url      text,
  date             date not null default current_date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_expenses_org on public.expenses(org_id);

create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function set_updated_at();

-- ─── Service Requests (booking widget — public insert allowed) ─────────────────

create table public.service_requests (
  id                    uuid primary key default uuid_generate_v4(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  client_id             uuid references public.clients(id) on delete set null,
  status                text not null default 'new'
                          check (status in ('new','reviewing','scheduled','declined')),
  name                  text not null,
  email                 text,
  phone                 text,
  service_type          text,
  preferred_date        date,
  preferred_time        text,
  message               text,
  address               text,
  converted_to_job_id   uuid references public.jobs(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_service_requests_org on public.service_requests(org_id);
create index idx_service_requests_status on public.service_requests(org_id, status);

create trigger trg_service_requests_updated_at
  before update on public.service_requests
  for each row execute function set_updated_at();

-- ─── Communications ────────────────────────────────────────────────────────────

create table public.communications (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  job_id      uuid references public.jobs(id) on delete set null,
  invoice_id  uuid references public.invoices(id) on delete set null,
  type        text not null check (type in ('email','sms','call','note','portal_message')),
  direction   text not null check (direction in ('inbound','outbound')),
  subject     text,
  body        text not null,
  sent_by     uuid references public.profiles(id) on delete set null,
  sent_at     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index idx_communications_org on public.communications(org_id);
create index idx_communications_client on public.communications(org_id, client_id);

-- ─── GPS Tracks ────────────────────────────────────────────────────────────────

create table public.gps_tracks (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  team_member_id   uuid not null references public.team_members(id) on delete cascade,
  job_id           uuid references public.jobs(id) on delete set null,
  lat              double precision not null,
  lng              double precision not null,
  accuracy         double precision,
  recorded_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index idx_gps_tracks_org_member on public.gps_tracks(org_id, team_member_id);
create index idx_gps_tracks_recorded_at on public.gps_tracks(org_id, recorded_at desc);

-- ─── App Settings ──────────────────────────────────────────────────────────────

create table public.app_settings (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  key         text not null,
  value       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, key)
);

create index idx_app_settings_org on public.app_settings(org_id);

create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function set_updated_at();

-- ─── Onboarding Responses ─────────────────────────────────────────────────────

create table public.onboarding_responses (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  step        integer not null,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, step)
);

create trigger trg_onboarding_responses_updated_at
  before update on public.onboarding_responses
  for each row execute function set_updated_at();

-- ─── Job Form Templates & Submissions ─────────────────────────────────────────

create table public.job_form_templates (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  description   text,
  fields        jsonb not null default '[]',
  industry_tag  text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_job_form_templates_org on public.job_form_templates(org_id);

create trigger trg_job_form_templates_updated_at
  before update on public.job_form_templates
  for each row execute function set_updated_at();

create table public.job_form_submissions (
  id             uuid primary key default uuid_generate_v4(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  job_id         uuid not null references public.jobs(id) on delete cascade,
  template_id    uuid not null references public.job_form_templates(id) on delete restrict,
  technician_id  uuid not null references public.profiles(id),
  answers        jsonb not null default '{}',
  submitted_at   timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index idx_job_form_submissions_job on public.job_form_submissions(job_id);

-- ─── Inventory ─────────────────────────────────────────────────────────────────

create table public.inventory_items (
  id                 uuid primary key default uuid_generate_v4(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  name               text not null,
  sku                text,
  description        text,
  unit               text not null default 'each',
  cost               numeric(10,2),
  reorder_point      integer,
  quantity_on_hand   integer not null default 0,
  location           text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_inventory_items_org on public.inventory_items(org_id);

create trigger trg_inventory_items_updated_at
  before update on public.inventory_items
  for each row execute function set_updated_at();

create table public.inventory_transactions (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  inventory_item_id   uuid not null references public.inventory_items(id) on delete restrict,
  job_id              uuid references public.jobs(id) on delete set null,
  type                text not null check (type in ('in','out','adjustment')),
  quantity            integer not null,
  notes               text,
  created_by          uuid not null references public.profiles(id),
  created_at          timestamptz not null default now()
);

create index idx_inventory_transactions_item on public.inventory_transactions(inventory_item_id);

-- Auto-update quantity_on_hand
create or replace function update_inventory_quantity()
returns trigger language plpgsql as $$
begin
  if new.type = 'in' then
    update public.inventory_items
    set quantity_on_hand = quantity_on_hand + new.quantity
    where id = new.inventory_item_id;
  elsif new.type = 'out' then
    update public.inventory_items
    set quantity_on_hand = quantity_on_hand - new.quantity
    where id = new.inventory_item_id;
  elsif new.type = 'adjustment' then
    update public.inventory_items
    set quantity_on_hand = new.quantity
    where id = new.inventory_item_id;
  end if;
  return new;
end;
$$;

create trigger trg_inventory_transactions_qty
  after insert on public.inventory_transactions
  for each row execute function update_inventory_quantity();

-- ─── Review Requests ───────────────────────────────────────────────────────────

create table public.review_requests (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  job_id       uuid not null references public.jobs(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  platform     text not null default 'google' check (platform in ('google','facebook','other')),
  status       text not null default 'pending'
                 check (status in ('pending','sent','clicked','reviewed')),
  sent_at      timestamptz,
  clicked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_review_requests_org on public.review_requests(org_id);

create trigger trg_review_requests_updated_at
  before update on public.review_requests
  for each row execute function set_updated_at();

-- ─── Maintenance Agreements ────────────────────────────────────────────────────

create table public.maintenance_agreements (
  id                        uuid primary key default uuid_generate_v4(),
  org_id                    uuid not null references public.organizations(id) on delete cascade,
  client_id                 uuid not null references public.clients(id) on delete restrict,
  property_id               uuid references public.properties(id) on delete set null,
  name                      text not null,
  description               text,
  status                    text not null default 'active'
                              check (status in ('active','paused','cancelled','expired')),
  billing_cycle             text not null default 'monthly'
                              check (billing_cycle in ('monthly','quarterly','annually')),
  amount                    numeric(10,2) not null,
  visits_per_cycle          integer not null default 1,
  next_billing_date         date,
  next_visit_date           date,
  start_date                date not null default current_date,
  end_date                  date,
  stripe_subscription_id    text unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index idx_maintenance_agreements_org on public.maintenance_agreements(org_id);
create index idx_maintenance_agreements_client on public.maintenance_agreements(org_id, client_id);

create trigger trg_maintenance_agreements_updated_at
  before update on public.maintenance_agreements
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Every table is scoped to the user's organization.
-- ============================================================

-- Helper: get current user's org_id from profiles
create or replace function public.my_org_id()
returns uuid language sql stable security definer as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.properties enable row level security;
alter table public.service_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.jobs enable row level security;
alter table public.job_visits enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.team_members enable row level security;
alter table public.time_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.service_requests enable row level security;
alter table public.communications enable row level security;
alter table public.gps_tracks enable row level security;
alter table public.app_settings enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.job_form_templates enable row level security;
alter table public.job_form_submissions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.review_requests enable row level security;
alter table public.maintenance_agreements enable row level security;

-- Organizations: members can read their own org, only owners can update
create policy "org_select" on public.organizations
  for select using (id = public.my_org_id());

create policy "org_update" on public.organizations
  for update using (
    id = public.my_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner','admin')
    )
  );

-- Profiles: users see their own org's profiles
create policy "profiles_select" on public.profiles
  for select using (org_id = public.my_org_id());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Standard tenant-scoped policy macro for core tables
-- (All tables: select/insert/update/delete scoped to my_org_id())

-- clients
create policy "clients_all" on public.clients
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- properties
create policy "properties_all" on public.properties
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- service_items
create policy "service_items_all" on public.service_items
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- quotes
create policy "quotes_all" on public.quotes
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- quote_items
create policy "quote_items_all" on public.quote_items
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- jobs
create policy "jobs_all" on public.jobs
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- job_visits
create policy "job_visits_all" on public.job_visits
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- invoices
create policy "invoices_all" on public.invoices
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- invoice_items
create policy "invoice_items_all" on public.invoice_items
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- payments
create policy "payments_all" on public.payments
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- team_members
create policy "team_members_all" on public.team_members
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- time_entries
create policy "time_entries_all" on public.time_entries
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- expenses
create policy "expenses_all" on public.expenses
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- service_requests: public insert (no auth) + org members can read/update
create policy "service_requests_insert_public" on public.service_requests
  for insert with check (true);

create policy "service_requests_select_org" on public.service_requests
  for select using (org_id = public.my_org_id());

create policy "service_requests_update_org" on public.service_requests
  for update using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- communications
create policy "communications_all" on public.communications
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- gps_tracks
create policy "gps_tracks_all" on public.gps_tracks
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- app_settings
create policy "app_settings_all" on public.app_settings
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- onboarding_responses
create policy "onboarding_all" on public.onboarding_responses
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- job_form_templates
create policy "jft_all" on public.job_form_templates
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- job_form_submissions
create policy "jfs_all" on public.job_form_submissions
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- inventory_items
create policy "inventory_items_all" on public.inventory_items
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- inventory_transactions
create policy "inventory_tx_all" on public.inventory_transactions
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- review_requests
create policy "review_requests_all" on public.review_requests
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

-- maintenance_agreements
create policy "maintenance_agreements_all" on public.maintenance_agreements
  using (org_id = public.my_org_id())
  with check (org_id = public.my_org_id());

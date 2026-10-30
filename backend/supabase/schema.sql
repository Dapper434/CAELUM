-- CAELUM schema (Edwin's zone)
-- PostgreSQL 15 + pgvector on Supabase.
--
-- People first, AI second:
--   * Shelf life, distance, and days-of-cover are NOT stored as model output.
--     Workers compute them in Python from expiry_date, coordinates, and demand_logs.
--   * hospital_policies holds Ministry of Health SOP chunks for cosine search.
--   * The validation shield accepts a unit only when blood_inventory.status
--     is 'available', reserved_at is null, and expiry_date is still in the future.
--
-- Apply in the Supabase SQL editor, or: psql "$DATABASE_URL" -f backend/supabase/schema.sql

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'blood_group') then
    create type public.blood_group as enum (
      'O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'blood_product') then
    create type public.blood_product as enum (
      'packed_rbc',   -- shelf life 35–42 days; enforced by expiry_date, not by the LLM
      'platelets',    -- shelf life 5–7 days
      'plasma',
      'whole_blood'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_status') then
    create type public.inventory_status as enum (
      'available',
      'reserved',
      'in_transit',
      'transferred',
      'expired',
      'discarded'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'proposal_status') then
    create type public.proposal_status as enum (
      'pending_approval',
      'approved',
      'rejected',
      'invalidated'   -- hard validator rejected the LLM unit codes
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'transfer_stage') then
    create type public.transfer_stage as enum (
      'approved',
      'courier_assigned',
      'in_transit',
      'delivered',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'alert_urgency') then
    create type public.alert_urgency as enum (
      'critical',
      'urgent',
      'moderate',
      'resolving'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- facilities
-- Rows arrive only from the KMHFR onboarding service after a Master Facility
-- List code is accepted. The LLM is not allowed to insert facilities.
-- ---------------------------------------------------------------------------

create table if not exists public.facilities (
  id            uuid primary key default gen_random_uuid(),
  mfl_code      text not null,
  name          text not null,
  county        text not null,
  region_code   text not null,
  keph_level    smallint not null,
  level_label   text not null,
  latitude      double precision,
  longitude     double precision,
  is_active     boolean not null default true,
  onboarded_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint facilities_mfl_code_key unique (mfl_code),
  constraint facilities_mfl_code_format check (mfl_code ~ '^[0-9]{1,10}$'),
  constraint facilities_keph_level_range check (keph_level between 1 and 6),
  constraint facilities_name_present check (char_length(btrim(name)) > 0),
  constraint facilities_county_present check (char_length(btrim(county)) > 0),
  constraint facilities_region_known check (
    region_code in ('nairobi', 'south_rift', 'north_rift')
  ),
  constraint facilities_coords_pair check (
    (latitude is null and longitude is null)
    or (
      latitude is not null and longitude is not null
      and latitude between -5 and 6
      and longitude between 33 and 42
    )
  )
);

comment on table public.facilities is
  'KMHFR-verified facilities. mfl_code is the Kenya Master Facility List code.';
comment on column public.facilities.keph_level is
  'Kenya Essential Package for Health level, 1–6. Logistics and the UI read this; the LLM does not assign it.';
comment on column public.facilities.region_code is
  'Operating catchment. Transfers are refused across regions. nairobi, south_rift, or north_rift.';

drop trigger if exists facilities_set_updated_at on public.facilities;
create trigger facilities_set_updated_at
  before update on public.facilities
  for each row execute function public.set_updated_at();

create index if not exists facilities_county_idx
  on public.facilities (county);

create index if not exists facilities_region_idx
  on public.facilities (region_code)
  where is_active;

-- Databases created before region_code existed pick the column up here.
alter table public.facilities add column if not exists region_code text;

update public.facilities
set region_code = case
  when county in ('Nairobi', 'Kiambu', 'Machakos', 'Kajiado') then 'nairobi'
  when county in ('Nakuru', 'Narok', 'Baringo') then 'south_rift'
  when county in ('Uasin Gishu', 'Nandi', 'Trans Nzoia', 'Elgeyo-Marakwet') then 'north_rift'
  else region_code
end
where region_code is null;

do $$
begin
  if not exists (select 1 from public.facilities where region_code is null) then
    alter table public.facilities alter column region_code set not null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'facilities_region_known'
      and conrelid = 'public.facilities'::regclass
  ) then
    alter table public.facilities
      add constraint facilities_region_known
      check (region_code in ('nairobi', 'south_rift', 'north_rift'));
  end if;
end $$;

create index if not exists facilities_active_idx
  on public.facilities (is_active)
  where is_active;

-- ---------------------------------------------------------------------------
-- blood_inventory
-- One row per physical unit. unit_code is the bag ID the validator checks
-- (for example BB-8941). lot_number is the collection lot and is not unique.
-- ---------------------------------------------------------------------------

create table if not exists public.blood_inventory (
  id                     uuid primary key default gen_random_uuid(),
  unit_code              text not null,
  lot_number             text not null,
  facility_id            uuid not null references public.facilities (id) on delete restrict,
  blood_group            public.blood_group not null,
  product_type           public.blood_product not null default 'packed_rbc',
  expiry_date            timestamptz not null,
  collected_at           timestamptz,
  status                 public.inventory_status not null default 'available',
  reserved_at            timestamptz,
  reserved_transfer_id   uuid,
  storage_temp_c         numeric(4, 1),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint blood_inventory_unit_code_key unique (unit_code),
  constraint blood_inventory_unit_code_format check (unit_code ~ '^[A-Z0-9][A-Z0-9-]{2,31}$'),
  constraint blood_inventory_lot_present check (char_length(btrim(lot_number)) > 0),
  constraint blood_inventory_temp_range check (
    storage_temp_c is null or storage_temp_c between 0 and 10
  ),
  constraint blood_inventory_reservation_ck check (
    (
      status in ('reserved', 'in_transit')
      and reserved_at is not null
    )
    or (
      status not in ('reserved', 'in_transit')
      and reserved_at is null
      and reserved_transfer_id is null
    )
  )
);

comment on table public.blood_inventory is
  'Physical unit ledger. A unit is proposable only when status = available, reserved_at is null, and expiry_date > now().';
comment on column public.blood_inventory.unit_code is
  'Bag ID returned to the React inbox only after validator.py confirms this row.';
comment on column public.blood_inventory.expiry_date is
  'Absolute expiry instant. Remaining shelf life is computed in logistics_worker.py, never by the LLM.';

drop trigger if exists blood_inventory_set_updated_at on public.blood_inventory;
create trigger blood_inventory_set_updated_at
  before update on public.blood_inventory
  for each row execute function public.set_updated_at();

create index if not exists blood_inventory_facility_group_idx
  on public.blood_inventory (facility_id, blood_group, product_type, status);

create index if not exists blood_inventory_available_expiry_idx
  on public.blood_inventory (facility_id, blood_group, expiry_date)
  where status = 'available';

create index if not exists blood_inventory_lot_idx
  on public.blood_inventory (lot_number);

-- ---------------------------------------------------------------------------
-- demand_logs
-- Daily issue counts. forecast_worker.py fits Holt-Winters on this table.
-- ---------------------------------------------------------------------------

create table if not exists public.demand_logs (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  blood_group   public.blood_group not null,
  product_type  public.blood_product not null default 'packed_rbc',
  log_date      date not null,
  units_issued  integer not null,
  created_at    timestamptz not null default now(),
  constraint demand_logs_natural_key unique (facility_id, blood_group, product_type, log_date),
  constraint demand_logs_units_nonnegative check (units_issued >= 0)
);

comment on table public.demand_logs is
  'Historical daily issues per facility and blood group. Input to Holt-Winters; not an LLM feature store.';

create index if not exists demand_logs_series_idx
  on public.demand_logs (facility_id, blood_group, product_type, log_date);

-- ---------------------------------------------------------------------------
-- shortage_alerts
-- Persisted forecast flags (depletion inside 72 hours) for the alerts panel.
-- days_of_cover is written by forecast_worker.py.
-- ---------------------------------------------------------------------------

create table if not exists public.shortage_alerts (
  id                   uuid primary key default gen_random_uuid(),
  facility_id          uuid not null references public.facilities (id) on delete cascade,
  blood_group          public.blood_group not null,
  product_type         public.blood_product not null default 'packed_rbc',
  units_remaining      integer not null,
  days_of_cover        numeric(8, 2) not null,
  depletion_at         timestamptz,
  urgency              public.alert_urgency not null,
  surge_context        text,
  suggested_facility_id uuid references public.facilities (id) on delete set null,
  is_open              boolean not null default true,
  detected_at          timestamptz not null default now(),
  resolved_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint shortage_alerts_units_nonnegative check (units_remaining >= 0),
  constraint shortage_alerts_cover_nonnegative check (days_of_cover >= 0)
);

comment on table public.shortage_alerts is
  'Forecast worker output. days_of_cover is a Python result, not an LLM estimate.';

drop trigger if exists shortage_alerts_set_updated_at on public.shortage_alerts;
create trigger shortage_alerts_set_updated_at
  before update on public.shortage_alerts
  for each row execute function public.set_updated_at();

create index if not exists shortage_alerts_open_idx
  on public.shortage_alerts (urgency, detected_at desc)
  where is_open;

-- ---------------------------------------------------------------------------
-- transfer_proposals
-- HITL inbox. Created only after validator.py accepts every unit_code.
-- Human approval inserts a transfers row; the model never dispatches.
-- ---------------------------------------------------------------------------

create table if not exists public.transfer_proposals (
  id                      uuid primary key default gen_random_uuid(),
  proposal_code           text not null,
  manifest_code           text not null,
  status                  public.proposal_status not null default 'pending_approval',
  donor_facility_id       uuid not null references public.facilities (id) on delete restrict,
  recipient_facility_id   uuid not null references public.facilities (id) on delete restrict,
  blood_group             public.blood_group not null,
  product_type            public.blood_product not null default 'packed_rbc',
  quantity                integer not null,
  distance_km             numeric(8, 2) not null,
  transit_minutes         integer not null,
  donor_reserve_days      numeric(8, 2) not null,
  shelf_life_hours        numeric(10, 2) not null,
  cold_chain_viable       boolean not null,
  donor_reserve_safe      boolean not null,
  ai_rationale            text not null,
  policy_citation         text,
  policy_id               uuid,
  verification_hash       text not null,
  worker_context          jsonb not null,
  decided_by              text,
  decided_at              timestamptz,
  rejection_reason        text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint transfer_proposals_code_key unique (proposal_code),
  constraint transfer_proposals_manifest_key unique (manifest_code),
  constraint transfer_proposals_distinct_facilities check (donor_facility_id <> recipient_facility_id),
  constraint transfer_proposals_quantity_positive check (quantity between 1 and 20),
  constraint transfer_proposals_distance_positive check (distance_km > 0),
  constraint transfer_proposals_transit_positive check (transit_minutes > 0),
  constraint transfer_proposals_reserve_floor check (donor_reserve_days >= 3),
  constraint transfer_proposals_shelf_life_positive check (shelf_life_hours > 0),
  constraint transfer_proposals_safety_flags check (cold_chain_viable and donor_reserve_safe),
  constraint transfer_proposals_decision_ck check (
    (status = 'pending_approval' and decided_at is null)
    or (status <> 'pending_approval' and decided_at is not null)
  )
);

comment on table public.transfer_proposals is
  'Human approval inbox. Numeric columns are copied from deterministic workers and re-checked before insert.';
comment on column public.transfer_proposals.worker_context is
  'Frozen JSON payload from forecast, logistics, and RAG workers. Audit only; the UI math is the typed columns.';
comment on column public.transfer_proposals.verification_hash is
  'Deterministic digest from validator.py over the accepted unit codes and ledger row versions.';

drop trigger if exists transfer_proposals_set_updated_at on public.transfer_proposals;
create trigger transfer_proposals_set_updated_at
  before update on public.transfer_proposals
  for each row execute function public.set_updated_at();

create index if not exists transfer_proposals_pending_idx
  on public.transfer_proposals (created_at desc)
  where status = 'pending_approval';

-- ---------------------------------------------------------------------------
-- transfers
-- Live dispatch pipeline the React client subscribes to:
-- approved -> courier_assigned -> in_transit -> delivered.
-- ---------------------------------------------------------------------------

create table if not exists public.transfers (
  id                      uuid primary key default gen_random_uuid(),
  transfer_code           text not null,
  manifest_code           text not null,
  proposal_id             uuid not null references public.transfer_proposals (id) on delete restrict,
  donor_facility_id       uuid not null references public.facilities (id) on delete restrict,
  recipient_facility_id   uuid not null references public.facilities (id) on delete restrict,
  blood_group             public.blood_group not null,
  product_type            public.blood_product not null default 'packed_rbc',
  quantity                integer not null,
  distance_km             numeric(8, 2) not null,
  transit_minutes         integer not null,
  stage                   public.transfer_stage not null default 'approved',
  cold_box                text,
  courier_driver          text,
  courier_vehicle         text,
  courier_coordinator     text,
  progress_percent        smallint,
  temperature_c           numeric(4, 1),
  approved_by             text not null,
  approved_at             timestamptz not null default now(),
  dispatched_at           timestamptz,
  delivered_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint transfers_code_key unique (transfer_code),
  constraint transfers_manifest_key unique (manifest_code),
  constraint transfers_proposal_key unique (proposal_id),
  constraint transfers_distinct_facilities check (donor_facility_id <> recipient_facility_id),
  constraint transfers_quantity_positive check (quantity between 1 and 20),
  constraint transfers_distance_positive check (distance_km > 0),
  constraint transfers_transit_positive check (transit_minutes > 0),
  constraint transfers_progress_range check (
    progress_percent is null or progress_percent between 0 and 100
  ),
  constraint transfers_temp_range check (
    temperature_c is null or temperature_c between 0 and 10
  ),
  constraint transfers_stage_fields_ck check (
    (stage = 'approved' and dispatched_at is null and delivered_at is null)
    or (stage = 'courier_assigned' and dispatched_at is null and delivered_at is null
        and courier_driver is not null and cold_box is not null)
    or (stage = 'in_transit' and dispatched_at is not null and delivered_at is null)
    or (stage = 'delivered' and dispatched_at is not null and delivered_at is not null)
    or (stage = 'cancelled')
  )
);

comment on table public.transfers is
  'Human-authorised movements. Realtime publication feeds the React transfer board.';

drop trigger if exists transfers_set_updated_at on public.transfers;
create trigger transfers_set_updated_at
  before update on public.transfers
  for each row execute function public.set_updated_at();

create index if not exists transfers_stage_idx
  on public.transfers (stage, created_at desc);

create index if not exists transfers_donor_idx
  on public.transfers (donor_facility_id);

create index if not exists transfers_recipient_idx
  on public.transfers (recipient_facility_id);

alter table public.blood_inventory
  drop constraint if exists blood_inventory_reserved_transfer_fkey;

alter table public.blood_inventory
  add constraint blood_inventory_reserved_transfer_fkey
  foreign key (reserved_transfer_id) references public.transfers (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- proposal_units / transfer_units
-- The LLM nominates unit_code values. These junctions record only rows the
-- validator resolved to blood_inventory primary keys.
-- ---------------------------------------------------------------------------

create table if not exists public.proposal_units (
  proposal_id    uuid not null references public.transfer_proposals (id) on delete cascade,
  inventory_id   uuid not null references public.blood_inventory (id) on delete restrict,
  created_at     timestamptz not null default now(),
  primary key (proposal_id, inventory_id)
);

create index if not exists proposal_units_inventory_idx
  on public.proposal_units (inventory_id);

create table if not exists public.transfer_units (
  transfer_id    uuid not null references public.transfers (id) on delete cascade,
  inventory_id   uuid not null references public.blood_inventory (id) on delete restrict,
  created_at     timestamptz not null default now(),
  primary key (transfer_id, inventory_id)
);

create index if not exists transfer_units_inventory_idx
  on public.transfer_units (inventory_id);

create index if not exists transfer_units_transfer_idx
  on public.transfer_units (transfer_id);

-- A delivered unit stays attached to its transfer. A cancelled transfer keeps
-- its line for the audit trail and releases the bag for a later proposal.
create or replace function public.proposal_units_one_open_claim()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.proposal_units pu
    join public.transfer_proposals tp on tp.id = pu.proposal_id
    where pu.inventory_id = new.inventory_id
      and pu.proposal_id <> new.proposal_id
      and tp.status in ('pending_approval', 'approved')
  ) then
    raise exception 'inventory unit % is already on an open proposal', new.inventory_id
      using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists proposal_units_one_open_claim on public.proposal_units;
create trigger proposal_units_one_open_claim
  before insert on public.proposal_units
  for each row execute function public.proposal_units_one_open_claim();

create or replace function public.transfer_units_one_active_move()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.transfer_units tu
    join public.transfers t on t.id = tu.transfer_id
    where tu.inventory_id = new.inventory_id
      and tu.transfer_id <> new.transfer_id
      and t.stage <> 'cancelled'
  ) then
    raise exception 'inventory unit % is already on an active transfer', new.inventory_id
      using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists transfer_units_one_active_move on public.transfer_units;
create trigger transfer_units_one_active_move
  before insert on public.transfer_units
  for each row execute function public.transfer_units_one_active_move();

-- ---------------------------------------------------------------------------
-- hospital_policies  (pgvector)
-- Embedding width is 1024 to stay inside the Supabase HNSW limit of 2000.
-- rag_retriever.py must request NEMOTRON_EMBED_DIM=1024.
-- facility_id null means a national Ministry of Health SOP.
-- ---------------------------------------------------------------------------

create table if not exists public.hospital_policies (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid references public.facilities (id) on delete cascade,
  title         text not null,
  source        text not null,
  section_ref   text,
  content       text not null,
  embedding     extensions.vector(1024),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint hospital_policies_title_present check (char_length(btrim(title)) > 0),
  constraint hospital_policies_content_present check (char_length(btrim(content)) > 0),
  constraint hospital_policies_source_present check (char_length(btrim(source)) > 0)
);

comment on table public.hospital_policies is
  'MoH SOPs and bilateral transfer agreements. Cosine search via match_hospital_policies().';
comment on column public.hospital_policies.embedding is
  'Nemotron 3.5 Embed 1B vector, truncated to 1024 dimensions.';

drop trigger if exists hospital_policies_set_updated_at on public.hospital_policies;
create trigger hospital_policies_set_updated_at
  before update on public.hospital_policies
  for each row execute function public.set_updated_at();

create index if not exists hospital_policies_facility_idx
  on public.hospital_policies (facility_id);

create index if not exists hospital_policies_embedding_hnsw
  on public.hospital_policies
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.transfer_proposals
  drop constraint if exists transfer_proposals_policy_fkey;

alter table public.transfer_proposals
  add constraint transfer_proposals_policy_fkey
  foreign key (policy_id) references public.hospital_policies (id) on delete set null;

-- ---------------------------------------------------------------------------
-- validation_events
-- Append-only shield log. Invalid LLM unit codes are recorded here and the
-- proposal is stored as invalidated or replaced by the logistics fallback.
-- ---------------------------------------------------------------------------

create table if not exists public.validation_events (
  id              uuid primary key default gen_random_uuid(),
  proposal_code   text,
  accepted        boolean not null,
  claimed_codes   text[] not null,
  missing_codes   text[] not null default '{}',
  reserved_codes  text[] not null default '{}',
  expired_codes   text[] not null default '{}',
  detail          text not null,
  created_at      timestamptz not null default now(),
  constraint validation_events_claimed_present check (cardinality(claimed_codes) > 0)
);

comment on table public.validation_events is
  'Hard-validator audit. Every orchestrator unit list is logged, accepted or rejected.';

create index if not exists validation_events_created_idx
  on public.validation_events (created_at desc);

-- ---------------------------------------------------------------------------
-- Cosine match RPC for rag_retriever.py
-- National SOPs (facility_id is null) stay in scope when a facility filter is set.
-- ---------------------------------------------------------------------------

create or replace function public.match_hospital_policies(
  query_embedding extensions.vector(1024),
  match_count integer default 5,
  similarity_threshold double precision default 0.50,
  facility_filter uuid default null
)
returns table (
  id uuid,
  facility_id uuid,
  title text,
  source text,
  section_ref text,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select
    p.id,
    p.facility_id,
    p.title,
    p.source,
    p.section_ref,
    p.content,
    (1 - (p.embedding <=> query_embedding))::double precision as similarity
  from public.hospital_policies p
  where p.embedding is not null
    and (1 - (p.embedding <=> query_embedding)) >= similarity_threshold
    and (
      facility_filter is null
      or p.facility_id is null
      or p.facility_id = facility_filter
    )
  order by p.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

comment on function public.match_hospital_policies is
  'Backend RAG search. Returns national SOPs plus the recipient facility''s own policies.';

-- Name the React/Python contract asked for (match_policies) without a second index.
create or replace function public.match_policies(
  query_embedding extensions.vector(1024),
  match_count integer default 5,
  similarity_threshold double precision default 0.50,
  facility_filter uuid default null
)
returns table (
  id uuid,
  facility_id uuid,
  title text,
  source text,
  section_ref text,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select *
  from public.match_hospital_policies(
    query_embedding,
    match_count,
    similarity_threshold,
    facility_filter
  );
$$;

comment on function public.match_policies is
  'Alias of match_hospital_policies. rag_retriever.py calls this name.';

revoke all on function public.match_hospital_policies(
  extensions.vector, integer, double precision, uuid
) from public;

revoke all on function public.match_policies(
  extensions.vector, integer, double precision, uuid
) from public;

grant execute on function public.match_hospital_policies(
  extensions.vector, integer, double precision, uuid
) to service_role;

grant execute on function public.match_policies(
  extensions.vector, integer, double precision, uuid
) to service_role;

-- ---------------------------------------------------------------------------
-- Read model for the network dashboard
-- Days-of-cover is intentionally absent; forecast_worker.py owns that number.
-- ---------------------------------------------------------------------------

create or replace view public.v_available_stock
with (security_invoker = true) as
select
  i.facility_id,
  f.name as facility_name,
  f.county,
  f.region_code,
  f.keph_level,
  i.blood_group,
  i.product_type,
  count(*)::integer as units_available,
  count(*) filter (
    where i.expiry_date <= now() + interval '48 hours'
  )::integer as units_expiring_48h,
  min(i.expiry_date) as soonest_expiry
from public.blood_inventory i
join public.facilities f on f.id = i.facility_id
where i.status = 'available'
  and i.reserved_at is null
  and i.expiry_date > now()
  and f.is_active
group by i.facility_id, f.name, f.county, f.region_code, f.keph_level, i.blood_group, i.product_type;

comment on view public.v_available_stock is
  'Available, unreserved, unexpired units. security_invoker so RLS on the base tables applies.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- The Flask service role bypasses RLS and is the only writer.
-- The anon key used by the React app may read operational tables so
-- postgres_changes on transfers can render. Policy text stays server-side.
-- Production should drop the anon policies and require authenticated
-- network-manager sessions before go-live.
-- ---------------------------------------------------------------------------

alter table public.facilities enable row level security;
alter table public.blood_inventory enable row level security;
alter table public.demand_logs enable row level security;
alter table public.shortage_alerts enable row level security;
alter table public.transfer_proposals enable row level security;
alter table public.transfers enable row level security;
alter table public.proposal_units enable row level security;
alter table public.transfer_units enable row level security;
alter table public.hospital_policies enable row level security;
alter table public.validation_events enable row level security;

alter table public.facilities force row level security;
alter table public.blood_inventory force row level security;
alter table public.demand_logs force row level security;
alter table public.shortage_alerts force row level security;
alter table public.transfer_proposals force row level security;
alter table public.transfers force row level security;
alter table public.proposal_units force row level security;
alter table public.transfer_units force row level security;
alter table public.hospital_policies force row level security;
alter table public.validation_events force row level security;

drop policy if exists facilities_anon_read on public.facilities;
create policy facilities_anon_read
  on public.facilities
  for select
  to anon, authenticated
  using (is_active);

drop policy if exists blood_inventory_anon_read on public.blood_inventory;
create policy blood_inventory_anon_read
  on public.blood_inventory
  for select
  to anon, authenticated
  using (true);

drop policy if exists shortage_alerts_anon_read on public.shortage_alerts;
create policy shortage_alerts_anon_read
  on public.shortage_alerts
  for select
  to anon, authenticated
  using (true);

drop policy if exists transfer_proposals_anon_read on public.transfer_proposals;
create policy transfer_proposals_anon_read
  on public.transfer_proposals
  for select
  to anon, authenticated
  using (true);

drop policy if exists transfers_anon_read on public.transfers;
create policy transfers_anon_read
  on public.transfers
  for select
  to anon, authenticated
  using (true);

drop policy if exists proposal_units_anon_read on public.proposal_units;
create policy proposal_units_anon_read
  on public.proposal_units
  for select
  to anon, authenticated
  using (true);

drop policy if exists transfer_units_anon_read on public.transfer_units;
create policy transfer_units_anon_read
  on public.transfer_units
  for select
  to anon, authenticated
  using (true);

-- demand_logs, hospital_policies, and validation_events have RLS enabled
-- and no client policies, so the anon key cannot read them.

grant select on public.facilities to anon, authenticated;
grant select on public.blood_inventory to anon, authenticated;
grant select on public.shortage_alerts to anon, authenticated;
grant select on public.transfer_proposals to anon, authenticated;
grant select on public.transfers to anon, authenticated;
grant select on public.proposal_units to anon, authenticated;
grant select on public.transfer_units to anon, authenticated;
grant select on public.v_available_stock to anon, authenticated;

grant select, insert, update, delete on public.facilities to service_role;
grant select, insert, update, delete on public.blood_inventory to service_role;
grant select, insert, update, delete on public.demand_logs to service_role;
grant select, insert, update, delete on public.shortage_alerts to service_role;
grant select, insert, update, delete on public.transfer_proposals to service_role;
grant select, insert, update, delete on public.transfers to service_role;
grant select, insert, update, delete on public.proposal_units to service_role;
grant select, insert, update, delete on public.transfer_units to service_role;
grant select, insert, update, delete on public.hospital_policies to service_role;
grant select, insert on public.validation_events to service_role;
grant select on public.v_available_stock to service_role;

-- ---------------------------------------------------------------------------
-- Realtime broadcasts for the React client (useCaelum.js listens on transfers)
-- ---------------------------------------------------------------------------

do $$
declare
  target text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication not present; skip realtime wiring (expected off-platform).';
    return;
  end if;

  foreach target in array array[
    'facilities',
    'blood_inventory',
    'shortage_alerts',
    'transfer_proposals',
    'transfers'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target);
    end if;

    execute format('alter table public.%I replica identity full', target);
  end loop;
end $$;

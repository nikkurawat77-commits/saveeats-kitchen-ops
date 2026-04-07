-- FreshMind application data schema
-- Run this after workspace_profiles.sql

create extension if not exists pgcrypto;

create type public.food_category as enum (
  'Vegetables',
  'Fruit',
  'Dairy',
  'Meat',
  'Bakery',
  'Pantry'
);

create type public.recipe_source as enum (
  'anthropic',
  'fallback',
  'manual'
);

create type public.listing_status as enum (
  'draft',
  'active',
  'reserved',
  'completed',
  'expired',
  'cancelled'
);

create type public.price_mode as enum (
  'free',
  'paid'
);

create or replace function public.set_entity_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category public.food_category not null,
  quantity_label text not null,
  expiry_date date not null,
  added_date date not null default current_date,
  reminder_enabled boolean not null default false,
  notes text,
  estimated_value numeric(10, 2) default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_items_user_id_idx on public.food_items(user_id);
create index if not exists food_items_expiry_date_idx on public.food_items(expiry_date);

drop trigger if exists set_food_items_updated_at on public.food_items;
create trigger set_food_items_updated_at
before update on public.food_items
for each row
execute function public.set_entity_updated_at();

alter table public.food_items enable row level security;

drop policy if exists "food_items_select_own" on public.food_items;
create policy "food_items_select_own"
on public.food_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "food_items_insert_own" on public.food_items;
create policy "food_items_insert_own"
on public.food_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "food_items_update_own" on public.food_items;
create policy "food_items_update_own"
on public.food_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "food_items_delete_own" on public.food_items;
create policy "food_items_delete_own"
on public.food_items
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text default '🍽️',
  time_label text,
  difficulty text,
  source public.recipe_source not null default 'manual',
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  is_saved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes(user_id);

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_entity_updated_at();

alter table public.recipes enable row level security;

drop policy if exists "recipes_select_own" on public.recipes;
create policy "recipes_select_own"
on public.recipes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "recipes_insert_own" on public.recipes;
create policy "recipes_insert_own"
on public.recipes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "recipes_update_own" on public.recipes;
create policy "recipes_update_own"
on public.recipes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "recipes_delete_own" on public.recipes;
create policy "recipes_delete_own"
on public.recipes
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  title text not null,
  quantity_label text not null,
  price_mode public.price_mode not null default 'free',
  price_amount numeric(10, 2) not null default 0,
  pickup_window text not null,
  distance_km numeric(10, 2) default 0,
  expiry_label text,
  status public.listing_status not null default 'active',
  photo_url text,
  is_saved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_listings_user_id_idx on public.marketplace_listings(user_id);
create index if not exists marketplace_listings_status_idx on public.marketplace_listings(status);

drop trigger if exists set_marketplace_listings_updated_at on public.marketplace_listings;
create trigger set_marketplace_listings_updated_at
before update on public.marketplace_listings
for each row
execute function public.set_entity_updated_at();

alter table public.marketplace_listings enable row level security;

drop policy if exists "marketplace_listings_select_own" on public.marketplace_listings;
create policy "marketplace_listings_select_own"
on public.marketplace_listings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "marketplace_listings_insert_own" on public.marketplace_listings;
create policy "marketplace_listings_insert_own"
on public.marketplace_listings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "marketplace_listings_update_own" on public.marketplace_listings;
create policy "marketplace_listings_update_own"
on public.marketplace_listings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "marketplace_listings_delete_own" on public.marketplace_listings;
create policy "marketplace_listings_delete_own"
on public.marketplace_listings
for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.restaurant_deals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cuisine text not null,
  deal_summary text not null,
  distance_km numeric(10, 2) not null,
  rating numeric(3, 2) not null default 0,
  discount_percent integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_restaurant_deals_updated_at on public.restaurant_deals;
create trigger set_restaurant_deals_updated_at
before update on public.restaurant_deals
for each row
execute function public.set_entity_updated_at();

alter table public.restaurant_deals enable row level security;

drop policy if exists "restaurant_deals_read_all" on public.restaurant_deals;
create policy "restaurant_deals_read_all"
on public.restaurant_deals
for select
to authenticated
using (is_active = true);

create table if not exists public.savings_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_month date not null,
  saved_amount numeric(10, 2) not null default 0,
  wasted_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_month)
);

create index if not exists savings_snapshots_user_id_idx on public.savings_snapshots(user_id);

drop trigger if exists set_savings_snapshots_updated_at on public.savings_snapshots;
create trigger set_savings_snapshots_updated_at
before update on public.savings_snapshots
for each row
execute function public.set_entity_updated_at();

alter table public.savings_snapshots enable row level security;

drop policy if exists "savings_snapshots_select_own" on public.savings_snapshots;
create policy "savings_snapshots_select_own"
on public.savings_snapshots
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "savings_snapshots_insert_own" on public.savings_snapshots;
create policy "savings_snapshots_insert_own"
on public.savings_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "savings_snapshots_update_own" on public.savings_snapshots;
create policy "savings_snapshots_update_own"
on public.savings_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "savings_snapshots_delete_own" on public.savings_snapshots;
create policy "savings_snapshots_delete_own"
on public.savings_snapshots
for delete
to authenticated
using (auth.uid() = user_id);

comment on table public.food_items is 'User-managed kitchen inventory with expiry tracking.';
comment on table public.recipes is 'Saved and generated FreshMind recipes.';
comment on table public.marketplace_listings is 'User-created rescue marketplace listings.';
comment on table public.restaurant_deals is 'Public restaurant rescue offers shown in the app.';
comment on table public.savings_snapshots is 'Monthly savings and waste comparison snapshots.';

# FreshMind Data Model

This is the recommended production persistence model for FreshMind.

## Core Tables

### `workspace_profiles`

Purpose:
- SaaS account state
- workspace name
- plan, seats, AI credits, trial dates, monthly goal

File:
- [supabase/workspace_profiles.sql](C:\Users\Ayush%20Rawat\Documents\New%20project\supabase\workspace_profiles.sql)

### `food_items`

Purpose:
- fridge inventory
- expiry tracking
- reminder flags
- category and quantity
- future value scoring

Maps from current frontend state:
- `freshmind-food-items`

### `recipes`

Purpose:
- saved recipes
- AI-generated recipes
- manual recipes
- ingredients and steps as JSON

Maps from current frontend state:
- `freshmind-saved-recipes`
- `freshmind-recipe-suggestions`

### `marketplace_listings`

Purpose:
- user-created leftover food listings
- pricing mode
- pickup window
- listing lifecycle
- optional relation to a `food_items` row

Maps from current frontend state:
- `freshmind-marketplace-listings`

### `restaurant_deals`

Purpose:
- nearby rescue offers from restaurants
- public read-only catalog

Maps from current frontend state:
- `freshmind-restaurant-deals`

### `savings_snapshots`

Purpose:
- month-by-month savings tracking
- reporting and charts

Maps from current frontend state:
- `freshmind-savings-history`

## Recommended Order

Run these SQL files in order:

1. [workspace_profiles.sql](C:\Users\Ayush%20Rawat\Documents\New%20project\supabase\workspace_profiles.sql)
2. [app_data_schema.sql](C:\Users\Ayush%20Rawat\Documents\New%20project\supabase\app_data_schema.sql)

## Migration Strategy

Short-term:
- keep the seeded demo fallback in the frontend
- use Supabase only when env vars are present

Next implementation step:
- add API routes for:
  - `food_items`
  - `recipes`
  - `marketplace_listings`
  - `savings_snapshots`

Then in the frontend:
- hydrate from API on login
- write through to API on create/update/delete
- keep local fallback for demo mode

## Why This Shape Works

- simple enough for a solo project
- strong enough for a real hosted portfolio product
- easy to expand into team workspaces later
- supports analytics, AI, marketplace flows, and billing without redesigning the schema

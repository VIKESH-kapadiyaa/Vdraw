# Supabase Setup for Vdraw

To ensure Vdraw works correctly in production, you must run the following SQL query in your Supabase SQL Editor.

This creates the necessary tables for storing drawings and enabling the realtime whitelist.

```sql
-- 1. Create the 'rooms' table
create table if not exists rooms (
  id uuid primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create the 'drawings' table
create table if not exists drawings (
  id uuid references rooms(id) on delete cascade primary key,
  elements jsonb,
  app_state jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Realtime for these tables (Optional, if you want presence)
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table drawings;

-- 4. Set RLS Policies (CRITICAL: ALLOW ANONYMOUS ACCESS)
-- Since Vdraw is a simple open tool, we allow anonymous reads and writes.
-- In a real production app, you would add Auth.

alter table rooms enable row level security;
alter table drawings enable row level security;

-- Allow anyone to create a room
create policy "Allow public insert on rooms"
on rooms for insert
with check (true);

-- Allow anyone to read rooms
create policy "Allow public read on rooms"
on rooms for select
using (true);

-- Allow anyone to read drawings
create policy "Allow public read on drawings"
on drawings for select
using (true);

-- Allow anyone to insert/update drawings
create policy "Allow public update on drawings"
on drawings for all
using (true);
-- 5. Create 'profiles' table (Required for Credits & Pro Logic)
create table if not exists profiles (
  id uuid primary key,
  usage_count int default 0,
  subscription_status text default 'free',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles enable row level security;

-- Allow public access (since using localStorage IDs)
create policy "Allow public access on profiles"
on profiles for all
using (true);
```

## How to run:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Click on **SQL Editor** (icon on the left sidebar).
4. Paste the SQL above.
5. Click **Run**.

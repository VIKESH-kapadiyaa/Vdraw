-- Run this in your Supabase SQL Editor

create table if not exists rooms (
  id uuid primary key,
  is_public boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Realtime for this table (optional, if you want to track room existence)
alter publication supabase_realtime add table rooms;

-- Enable RLS (Row Level Security)
alter table rooms enable row level security;

-- Create Policy to allow anyone (anon) to create a room
create policy "Allow public insert" on rooms for insert with check (true);

-- Create Policy to allow anyone to read rooms (needed for loading?)
-- Actually Whiteboard loads from 'drawings' table, not 'rooms' table for data.
-- But if you want to check if room exists:
create policy "Allow public select" on rooms for select using (true);

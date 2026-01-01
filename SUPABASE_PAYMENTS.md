-- 1. Create Profiles Table (for Usage & Subscriptions)
create table if not exists profiles (
  id uuid primary key, -- Use a consistent ID (Auth User ID or Persistent Device ID)
  subscription_status text default 'free',
  subscription_type text, -- 'monthly' or 'annual'
  subscription_start_date timestamp with time zone,
  subscription_end_date timestamp with time zone,
  usage_count int default 0,
  stripe_customer_id text,
  razorpay_customer_id text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table profiles enable row level security;

-- 3. Policies
-- Allow anyone to read/insert their own profile (insecure without Auth, assuming Client ID based)
-- For a real app, use: auth.uid() = id

create policy "Public Access for profiles"
on profiles for all
using (true)
with check (true);

-- 4. Sample Query to check usage logic
-- select * from profiles where id = 'USER_ID';
-- update profiles set usage_count = usage_count + 1 where id = 'USER_ID';

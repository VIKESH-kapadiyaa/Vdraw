-- Run this in your Supabase SQL Editor to set up the Vdraw SaaS Architecture

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the 'rooms' table with robust SaaS columns
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT DEFAULT 'Untitled Project',
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scene_data JSONB DEFAULT '{}'::jsonb,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Policy: Users can view their own rooms
CREATE POLICY "Users can view own rooms" 
ON public.rooms FOR SELECT 
USING (auth.uid() = owner_id);

-- Policy: Users can insert their own rooms
CREATE POLICY "Users can create own rooms" 
ON public.rooms FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own rooms
CREATE POLICY "Users can update own rooms" 
ON public.rooms FOR UPDATE 
USING (auth.uid() = owner_id);

-- Policy: Users can delete their own rooms
CREATE POLICY "Users can delete own rooms" 
ON public.rooms FOR DELETE 
USING (auth.uid() = owner_id);

-- 5. Enable Realtime for collaboration
-- This allows clients to listen to changes on the 'rooms' table
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- 6. (Optional) Create a profiles table if you haven't already
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    usage_count INTEGER DEFAULT 0,
    subscription_status TEXT DEFAULT 'free',
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Function to handle new user signup automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

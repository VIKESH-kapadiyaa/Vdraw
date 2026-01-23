-- Run this in your Supabase SQL Editor to FIX existing tables

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Add columns to 'rooms' table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'is_locked') THEN
        ALTER TABLE public.rooms ADD COLUMN is_locked BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'scene_data') THEN
        ALTER TABLE public.rooms ADD COLUMN scene_data JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'owner_id') THEN
        ALTER TABLE public.rooms ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'name') THEN
        ALTER TABLE public.rooms ADD COLUMN name TEXT DEFAULT 'Untitled Project';
    END IF;
END $$;

-- 3. Ensure RLS is enabled
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 4. Re-apply Policies (Drop first to avoid errors if they exist)
DROP POLICY IF EXISTS "Users can view own rooms" ON public.rooms;
CREATE POLICY "Users can view own rooms" ON public.rooms FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create own rooms" ON public.rooms;
CREATE POLICY "Users can create own rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own rooms" ON public.rooms;
CREATE POLICY "Users can update own rooms" ON public.rooms FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own rooms" ON public.rooms;
CREATE POLICY "Users can delete own rooms" ON public.rooms FOR DELETE USING (auth.uid() = owner_id);

-- 5. Ensure Profiles table exists and has correct columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    usage_count INTEGER DEFAULT 0,
    subscription_status TEXT DEFAULT 'free',
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Fix trigger function if it was missing or outdated
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

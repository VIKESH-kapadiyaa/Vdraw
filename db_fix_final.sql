-- Run this in your Supabase SQL Editor (Final Fix)

-- 1. Safely add missing columns
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

-- 2. Reset RLS Policies to ensure they are correct
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view rooms" ON public.rooms;
CREATE POLICY "Public can view rooms" ON public.rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can create rooms" ON public.rooms;
CREATE POLICY "Public can create rooms" ON public.rooms FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update rooms" ON public.rooms;
CREATE POLICY "Public can update rooms" ON public.rooms FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own rooms" ON public.rooms;
CREATE POLICY "Users can delete own rooms" ON public.rooms FOR DELETE USING (auth.uid() = owner_id);

-- 3. Safely Enable Realtime (Checks if already enabled to avoid error)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;
END $$;

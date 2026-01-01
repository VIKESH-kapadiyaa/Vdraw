-- Run this to update your EXISTING profiles table
-- We use "IF NOT EXISTS" logic implicitly by just adding columns.
-- If you run this multiple times, it might error saying "column already exists", which is fine.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_type') THEN
        ALTER TABLE profiles ADD COLUMN subscription_type text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_start_date') THEN
        ALTER TABLE profiles ADD COLUMN subscription_start_date timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_end_date') THEN
        ALTER TABLE profiles ADD COLUMN subscription_end_date timestamp with time zone;
    END IF;
END $$;

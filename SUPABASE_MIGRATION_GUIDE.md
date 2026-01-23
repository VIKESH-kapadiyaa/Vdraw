# Supabase Schema Update: Teacher Lock

To enable the "Teacher Master Control" feature, run the following SQL in your Supabase SQL Editor:

```sql
-- 1. Add 'is_locked' column to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- 2. Ensure Realtime captures this column
-- If you haven't enabled full replication:
-- alter publication supabase_realtime add table rooms;
```

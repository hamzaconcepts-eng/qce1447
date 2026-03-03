-- ============================================================
-- Evaluators Seed Script
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Step 1: Add 'name' column to users table (if it doesn't exist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Step 2: Insert the two evaluator accounts
-- Evaluator 1: سالم الحارثي | Username: salem.harthi | Password: 112233
INSERT INTO users (username, password_hash, role, name)
VALUES (
  'salem.harthi',
  '$2b$10$YMXMjHKI4wtloJjM.BOybeDU6j87FN7wsZJqmndqPJEKcRk2r1Wrq',
  'evaluator',
  'سالم الحارثي'
)
ON CONFLICT (username) DO NOTHING;

-- Evaluator 2: راشد المعمري | Username: rashid.maamari | Password: 998877
INSERT INTO users (username, password_hash, role, name)
VALUES (
  'rashid.maamari',
  '$2b$10$gqdA1Yni75LuaGedBDohcOjrQOB5m6ixP1q5i4/GW7rfem8SS1mBa',
  'evaluator',
  'راشد المعمري'
)
ON CONFLICT (username) DO NOTHING;

-- Step 3: Verify the accounts were created
SELECT id, username, name, role FROM users WHERE role = 'evaluator';

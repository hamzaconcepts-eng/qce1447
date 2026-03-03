-- Migration: Dual Evaluator System + Waqf Criterion
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)

-- Step 1: Add waqf_count column to evaluations
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS waqf_count INTEGER DEFAULT 0;

-- Step 2: Drop the old unique constraint on competitor_id alone (if it exists)
-- This allows multiple evaluations per competitor (one per evaluator)
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_competitor_id_key;

-- Step 3: Add unique constraint on (competitor_id, evaluator_name)
-- This allows upsert by evaluator and prevents duplicate entries per evaluator+competitor
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_competitor_id_evaluator_name_key;
ALTER TABLE evaluations
  ADD CONSTRAINT evaluations_competitor_id_evaluator_name_key
  UNIQUE (competitor_id, evaluator_name);

-- Step 4: Enable Realtime for the evaluations table (required for live updates)
-- Go to Supabase Dashboard → Database → Replication → enable evaluations table
-- Or run:
ALTER PUBLICATION supabase_realtime ADD TABLE evaluations;

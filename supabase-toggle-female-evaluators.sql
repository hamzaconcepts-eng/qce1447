-- Toggle female evaluators access
-- Add is_active column if it doesn't exist (default true = all users active)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- DISABLE female evaluators (run this to block their access)
UPDATE users SET is_active = false
WHERE username IN ('mwaheibi','emujaizi','somairi','romairi','hmamari','twadahi','amawali','mmawali','famri','mamri');

-- ENABLE female evaluators (run this to restore their access)
-- UPDATE users SET is_active = true
-- WHERE username IN ('mwaheibi','emujaizi','somairi','romairi','hmamari','twadahi','amawali','mmawali','famri','mamri');

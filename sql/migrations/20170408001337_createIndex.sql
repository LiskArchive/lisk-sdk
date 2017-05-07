/*
 * Add index for performance
 */

BEGIN;

-- Add 'mem_accounts2delegates_depId' index for fast delegates voters counting
CREATE INDEX IF NOT EXISTS "mem_accounts2delegates_depId" ON mem_accounts2delegates("dependentId");

COMMIT;

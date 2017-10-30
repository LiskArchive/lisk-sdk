/*
 * Runtime queries - executed at node start (right after migrations)
 */

BEGIN;

UPDATE "peers" SET "state" = 1, "clock" = NULL WHERE "state" != 0;

COMMIT;

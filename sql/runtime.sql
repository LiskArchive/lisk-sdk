/* Lisk Runtime
 *
 */

BEGIN;

UPDATE "peers" SET "state" = 1, "clock" = NULL WHERE "state" != 0;

COMMIT;

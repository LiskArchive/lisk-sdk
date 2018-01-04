/**
 * Rename port to wsPort in peers table.
 */

BEGIN;

ALTER TABLE "peers" RENAME COLUMN "port" to "wsPort";

COMMIT;

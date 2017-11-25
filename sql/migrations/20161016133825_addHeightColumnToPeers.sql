/* Add Height Column to Peers
 *
 */

BEGIN;

ALTER TABLE "peers" ADD COLUMN "height" INT;

CREATE INDEX IF NOT EXISTS "peers_height" ON "peers"("height");

COMMIT;

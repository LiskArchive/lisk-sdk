/* Add constraints to improve upserts
 *
 */

BEGIN;

ALTER TABLE "peers"
  ADD CONSTRAINT "address_unique" UNIQUE
  USING INDEX "peers_unique";

COMMIT;
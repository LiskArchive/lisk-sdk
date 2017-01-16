/* Add constraints to improve upserts
 *
 */

BEGIN;

ALTER TABLE peers
  ADD CONSTRAINT unique_address
UNIQUE (ip, port);

COMMIT;
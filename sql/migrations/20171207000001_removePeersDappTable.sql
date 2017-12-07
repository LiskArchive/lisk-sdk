/* Remove peers_dapp table
 */

BEGIN;

DROP TABLE IF EXISTS "peers_dapp";

DROP INDEX IF EXISTS "peers_dapp_unique";

COMMIT;

/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */


/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

WITH delegate AS
  (SELECT 1
   FROM mem_accounts m
   WHERE m."isDelegate" = 1
     AND m."publicKey" = decode($1, 'hex')
   LIMIT 1),
     rewards AS
  (SELECT count(*), sum(reward) AS rewards, sum(fees) AS fees
   FROM rounds_rewards
   WHERE "publicKey" = decode($1, 'hex')
     AND ($2 IS NULL
          OR "timestamp" >= $2)
     AND ($3 IS NULL
          OR "timestamp" <= $3) )
SELECT
  (SELECT *
   FROM delegate) AS delegate,

  (SELECT count
   FROM rewards) AS count,

  (SELECT fees
   FROM rewards) AS fees,

  (SELECT rewards
   FROM rewards) AS rewards

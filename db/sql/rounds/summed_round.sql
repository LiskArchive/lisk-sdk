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

SELECT sum(r.fee)::bigint AS fees, array_agg(r.reward) AS rewards, array_agg(r.pk) AS delegates
FROM (SELECT b."totalFee" AS fee, b.reward, encode(b."generatorPublicKey", 'hex') AS pk FROM blocks b
WHERE ceil(b.height / $1::float)::int = $2
ORDER BY b.height ASC) r

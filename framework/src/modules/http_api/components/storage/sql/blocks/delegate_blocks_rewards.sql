/*
 * Copyright © 2019 Lisk Foundation
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
  DESCRIPTION: Get forging statistics within the specified timespan for an existing delegate address
  PARAMETERS: generatorPublicKey, fromTimestamp (optional), toTimestamp (optional)
*/

SELECT COUNT(*) count, SUM("totalFee") fees, SUM("reward") rewards
FROM blocks
WHERE "generatorPublicKey" = DECODE(${generatorPublicKey}, 'hex')
  AND (${fromTimestamp} IS NULL
    OR "timestamp" >= ${fromTimestamp})
  AND (${toTimestamp} IS NULL
    OR "timestamp" <= ${toTimestamp})

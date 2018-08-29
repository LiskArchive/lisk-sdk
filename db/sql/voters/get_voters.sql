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

SELECT t2.address, t2.balance, encode(t2."publicKey", 'hex') AS "publicKey" FROM mem_accounts2delegates t1
INNER JOIN mem_accounts t2 ON t1."accountId" = t2.address
WHERE t1."dependentId" = ${publicKey}
ORDER BY "${sortField:raw}" ${sortMethod:raw}
LIMIT ${limit} OFFSET ${offset}

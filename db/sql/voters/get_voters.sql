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

SELECT accounts.address, accounts.balance, encode(accounts."publicKey", 'hex') AS "publicKey" FROM mem_accounts2delegates delegates
INNER JOIN mem_accounts accounts ON delegates."accountId" = accounts.address
WHERE delegates."dependentId" = ${publicKey}
ORDER BY ${sortField:name} ${sortMethod:value}
LIMIT ${limit} OFFSET ${offset}

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
  DESCRIPTION: Gets delegates for a list of public keys.

  PARAMETERS:
      publicKeys - array of public keys (strings)
*/

SELECT encode("publicKey", 'hex') AS "publicKey",
       username,
       address
FROM mem_accounts
WHERE
  "isDelegate" = 1
  AND encode("publicKey", 'hex') IN (${publicKeys:csv})

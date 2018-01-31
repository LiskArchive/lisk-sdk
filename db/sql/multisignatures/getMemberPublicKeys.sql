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
  DESCRIPTION: Gets list of public keys for a member address

  PARAMETERS:
  		- address: Address of a member (string)
*/

SELECT array_agg("dependentId") AS "memberAccountKeys"
FROM mem_accounts2multisignatures
WHERE "accountId" = ${address}

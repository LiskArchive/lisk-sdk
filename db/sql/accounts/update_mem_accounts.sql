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

UPDATE mem_accounts
SET "u_isDelegate" = "isDelegate",
	"u_secondSignature" = "secondSignature",
	u_username = username,
	u_balance = balance,
	u_delegates = delegates,
	u_multisignatures = multisignatures,
	u_multimin = multimin,
	u_multilifetime =multilifetime
WHERE
	"u_isDelegate" <> "isDelegate" OR
	"u_secondSignature" <> "secondSignature" OR
	u_username <> username OR
	u_balance <> balance OR
	u_delegates <> delegates OR
	u_multisignatures <> multisignatures OR
	u_multimin <> multimin OR
	u_multilifetime <> multilifetime

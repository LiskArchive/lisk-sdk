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
  DESCRIPTION: Alter 'mem_account2multisignatures' table - change data type of 'dependentId' from VARCHAR(64) to bytea.

  PARAMETERS: None
*/

ALTER TABLE mem_accounts2multisignatures ALTER COLUMN "dependentId" TYPE bytea USING DECODE("dependentId", 'hex');

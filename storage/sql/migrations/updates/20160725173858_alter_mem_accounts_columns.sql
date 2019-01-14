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
  DESCRIPTION: Alter Mem Accounts Columns.

  PARAMETERS: None
*/

ALTER TABLE "mem_accounts" ALTER COLUMN "multimin" TYPE SMALLINT;

ALTER TABLE "mem_accounts" ALTER COLUMN "u_multimin" TYPE SMALLINT;

ALTER TABLE "mem_accounts" ALTER COLUMN "multilifetime" TYPE SMALLINT;

ALTER TABLE "mem_accounts" ALTER COLUMN "u_multilifetime" TYPE SMALLINT;

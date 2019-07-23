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
  DESCRIPTION: Remove all uncofirmed state related schema properties as they're handled in memory now.
   PARAMETERS: None
*/

 ALTER TABLE mem_accounts
DROP COLUMN "u_isDelegate",
DROP COLUMN "u_secondSignature",
DROP COLUMN "u_username",
DROP COLUMN "u_delegates",
DROP COLUMN "u_multisignatures",
DROP COLUMN "u_multimin",
DROP COLUMN "u_multilifetime",
DROP COLUMN "u_nameexist",
DROP COLUMN "u_balance";

 DROP TABLE IF EXISTS "mem_accounts2u_delegates";

 DROP TABLE IF EXISTS "mem_accounts2u_multisignatures";
 
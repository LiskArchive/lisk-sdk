/*
 * Copyright © 2020 Lisk Foundation
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
   DESCRIPTION: Add keys field for mem_accounts column
   PARAMETERS: None
*/

 -- Add asset column to trs table as jsonb
ALTER TABLE "mem_accounts" ADD COLUMN IF NOT EXISTS "keys" jsonb;
ALTER TABLE "mem_accounts" DROP COLUMN IF EXISTS "membersPublicKeys"
ALTER TABLE "mem_accounts" DROP COLUMN IF EXISTS "multimin"
ALTER TABLE "mem_accounts" DROP COLUMN IF EXISTS "multilifetime"

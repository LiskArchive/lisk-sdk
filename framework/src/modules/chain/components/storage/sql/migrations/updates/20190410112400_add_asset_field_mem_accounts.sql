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
   DESCRIPTION: Add asset field for mem_accounts column
   PARAMETERS: None
*/

 -- Add asset column to trs table as jsonb
ALTER TABLE "mem_accounts" ADD COLUMN IF NOT EXISTS "asset" jsonb;

-- Create index for asset field. Using `gin` index as it's more efficient for keys or key/value search.
CREATE INDEX IF NOT EXISTS "mem_accounts_asset" ON "mem_accounts" USING gin ("asset");

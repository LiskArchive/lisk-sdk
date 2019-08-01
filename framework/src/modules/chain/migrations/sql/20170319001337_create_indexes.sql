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
  DESCRIPTION: Adds various indexes for performance.

  PARAMETERS: None
*/

-- Add 'mem_accounts_address' index for 'address'
CREATE INDEX IF NOT EXISTS "mem_accounts_address" ON "mem_accounts" ("address");

-- Add 'mem_accounts_address_upper' index for upper case 'address'
CREATE INDEX IF NOT EXISTS "mem_accounts_address_upper" ON "mem_accounts" (UPPER("address"));

-- Add 'mem_accounts_is_delegate' index for 'isDelegate'
CREATE INDEX IF NOT EXISTS "mem_accounts_is_delegate" ON "mem_accounts" ("isDelegate");

-- Add 'mem_accounts_get_delegates' index for retrieving list of 101 delegates
CREATE INDEX IF NOT EXISTS "mem_accounts_get_delegates" ON "mem_accounts" ("vote" DESC, ENCODE("publicKey", 'hex') ASC) WHERE "isDelegate" = 1;

-- Add 'mem_accounts_block_id' index for 'blockId'
CREATE INDEX IF NOT EXISTS "mem_accounts_block_id" ON "mem_accounts" ("blockId");

-- Add 'blocks_rounds' index for dealing with rounds
CREATE INDEX IF NOT EXISTS "blocks_rounds" ON "blocks" ((CEIL(height / 101::float)::int));

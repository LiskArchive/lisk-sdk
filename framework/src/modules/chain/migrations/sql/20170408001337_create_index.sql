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
  DESCRIPTION: Adds index for performance.

  PARAMETERS: None
*/

-- Add 'mem_accounts2delegates_depId' index for fast delegates voters counting
CREATE INDEX IF NOT EXISTS "mem_accounts2delegates_depId" ON mem_accounts2delegates("dependentId");

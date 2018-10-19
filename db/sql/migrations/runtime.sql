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
  DESCRIPTION: Runtime queries - executed at node start (right after migrations).

  PARAMETERS: None
*/

-- Overwrite unconfirmed tables with state from confirmed tables
DROP TABLE mem_accounts2u_delegates;
CREATE TABLE mem_accounts2u_delegates AS TABLE mem_accounts2delegates;
ALTER TABLE mem_accounts2u_delegates ADD CONSTRAINT "mem_accounts2u_delegates_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES mem_accounts(address) ON DELETE CASCADE;
CREATE INDEX "mem_accounts2u_delegates_accountId" ON mem_accounts2u_delegates("accountId");

DROP TABLE mem_accounts2u_multisignatures;
CREATE TABLE mem_accounts2u_multisignatures AS TABLE mem_accounts2multisignatures;
ALTER TABLE mem_accounts2u_multisignatures ADD CONSTRAINT "mem_accounts2u_multisignatures_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES mem_accounts(address) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "mem_accounts2u_multisignatures_accountId" ON mem_accounts2u_multisignatures("accountId");




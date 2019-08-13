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
  DESCRIPTION: Add voteWeightReceived attribute to mem_accounts table
  PARAMETERS: None
*/

ALTER TABLE "mem_accounts" ADD COLUMN IF NOT EXISTS "voteWeightReceived" BIGINT DEFAULT 0;

UPDATE "mem_accounts" SET "voteWeightReceived" = "vote";

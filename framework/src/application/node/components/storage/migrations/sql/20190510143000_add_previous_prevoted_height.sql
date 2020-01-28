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
   DESCRIPTION: Add maxHeightPreviouslyForged and maxHeightPrevoted field for blocks column. Both columns are of type 32-bit unsigned integer
   PARAMETERS: None
*/

  -- Add to blocks column
ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "maxHeightPreviouslyForged" INT;
ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "maxHeightPrevoted" INT;

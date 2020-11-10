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
  DESCRIPTION: Rename column name previousBlock to previousBlockId from blocks table
  See: https://github.com/LiskHQ/lisk-sdk/issues/4295
*/

ALTER TABLE blocks RENAME "previousBlock" TO "previousBlockId";


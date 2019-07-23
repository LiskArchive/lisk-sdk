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
  DESCRIPTION: A port number is a 16-bit unsigned integer, thus ranging from 0 to 65535. We need peers.wsPort to be of a data type that accepts this range

  PARAMETERS: None
*/

ALTER TABLE peers ALTER COLUMN "wsPort" TYPE INT;

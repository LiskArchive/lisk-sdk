/*
 * Copyright © 2022 Lisk Foundation
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

import { intToBuffer } from '@liskhq/lisk-cryptography';

// Returns the big endian uint32 serialization of an integer x, with 0 <= x < 2^32 which is 4 bytes long.
export const getIDAsKeyForStore = (id: number) => intToBuffer(id, 4);

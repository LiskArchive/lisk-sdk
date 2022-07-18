/*
 * Copyright © 2021 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';

export const MODULE_ID_RANDOM = 15;
export const MODULE_ID_RANDOM_BUFFER = utils.intToBuffer(MODULE_ID_RANDOM, 4);
export const DEFAULT_MAX_LENGTH_REVEALS = 206;
export const STORE_PREFIX_RANDOM = 0x0000;
export const STORE_PREFIX_REGISTERED_HASH_ONION = Buffer.from('00', 'hex');
export const STORE_PREFIX_USED_HASH_ONION = Buffer.from('01', 'hex');
export const EMPTY_KEY = Buffer.alloc(0);
export const SEED_REVEAL_HASH_SIZE = 16;

export const defaultConfig = {
	maxLengthReveals: DEFAULT_MAX_LENGTH_REVEALS,
};

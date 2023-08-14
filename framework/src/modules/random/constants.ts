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

export const MAX_LENGTH_REVEALS = 206; // DEFAULT_MAX_LENGTH_REVEALS in LIP-0063
export const STORE_PREFIX_REGISTERED_HASH_ONION = Buffer.from('00', 'hex');
export const STORE_PREFIX_USED_HASH_ONION = Buffer.from('01', 'hex');
export const EMPTY_KEY = Buffer.alloc(0);
export const SEED_LENGTH = 16;
export const ADDRESS_LENGTH = 20;
export const MAX_HASH_COMPUTATION = 10000;

export const defaultConfig = {
	maxLengthReveals: MAX_LENGTH_REVEALS,
};

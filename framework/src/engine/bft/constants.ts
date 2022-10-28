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

export const MODULE_NAME_BFT = 'bft';

export const MODULE_STORE_PREFIX_BFT = Buffer.from([0, 0, 0, 0]);

export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const BLS_PUBLIC_KEY_LENGTH = 48;
export const STORE_PREFIX_BFT_PARAMETERS = 0x0000;
export const STORE_PREFIX_BFT_VOTES = 0x4000;
export const SUBSTORE_PREFIX_GENESIS_DATA = 0x8000;
export const EMPTY_KEY = Buffer.alloc(0);
export const MAX_UINT32 = 2 ** 32 - 1;

export const defaultConfig = {
	batchSize: 103,
};

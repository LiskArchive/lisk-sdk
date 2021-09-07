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

export const MODULE_ID_VALIDATORS = 11; // TBD
export const STORE_PREFIX_VALIDATORS_DATA = Buffer.from('0000');
export const STORE_PREFIX_GENERATOR_LIST = Buffer.from('4000', 'hex');
export const STORE_PREFIX_BLS_KEYS = Buffer.from('8000', 'hex');
export const STORE_PREFIX_GENESIS_DATA = Buffer.from('c000', 'hex');
export const INVALID_BLS_KEY = Buffer.alloc(48);

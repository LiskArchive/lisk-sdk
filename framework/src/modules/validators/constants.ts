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
export const MODULE_NAME_VALIDATORS = 'validators';
export const SUBSTORE_PREFIX_VALIDATORS_DATA = 0x0000;
export const SUBSTORE_PREFIX_GENERATOR_LIST = 0x4000;
export const SUBSTORE_PREFIX_BLS_KEYS = 0x8000;
export const SUBSTORE_PREFIX_GENESIS_DATA = 0xc000;
export const INVALID_BLS_KEY = Buffer.alloc(48);
export const EMPTY_KEY = Buffer.alloc(0);

// Event names
export const EVENT_NAME_GENERATOR_KEY_REGISTRATION = Buffer.from([0, 0, 0, 1]);
export const EVENT_NAME_BLS_KEY_REGISTRATION = Buffer.from([0, 0, 0, 2]);

// Event results
export const KEY_REG_RESULT_SUCCESS = 0;
export const KEY_REG_RESULT_NO_VALIDATOR = 1;
export const KEY_REG_RESULT_ALREADY_VALIDATOR = 2;
export const KEY_REG_RESULT_DUPLICATE_BLS_KEY = 3;
export const KEY_REG_RESULT_INVALID_POP = 4;

// Key length
export const ADDRESS_LENGTH = 20;
export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const BLS_PUBLIC_KEY_LENGTH = 48;
export const BLS_POP_LENGTH = 96;

export const defaultConfig = {
	blockTime: 10,
};

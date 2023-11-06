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

export const MODULE_NAME_VALIDATORS = 'validators';
export const INVALID_BLS_KEY = Buffer.alloc(48);
export const EMPTY_KEY = Buffer.alloc(0);

// Event names
export const EVENT_NAME_GENERATOR_KEY_REGISTRATION = Buffer.from([0, 0, 0, 1]);
export const EVENT_NAME_BLS_KEY_REGISTRATION = Buffer.from([0, 0, 0, 2]);

// Event results
export const enum KeyRegResult {
	SUCCESS = 0,
	NO_VALIDATOR = 1,
	ALREADY_VALIDATOR = 2,
	DUPLICATE_BLS_KEY = 3,
	INVALID_POP = 4,
}

// Key length
export const ADDRESS_LENGTH = 20;
export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const BLS_PUBLIC_KEY_LENGTH = 48;
export const BLS_POP_LENGTH = 96;

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

export const MODULE_ID_INTEROPERABILITY = 64;
export const MODULE_NAME_INTEROPERABILITY = 'interoperability';

// General constants
export const MAINCHAIN_ID = 1;
export const LIVENESS_LIMIT = 2592000; // 30*24*3600
export const MAX_CCM_SIZE = 10240;

// Store prefixes
export const STORE_PREFIX_OUTBOX_ROOT = 0x0000;
export const STORE_PREFIX_CHAIN_DATA = 0x8000;
export const STORE_PREFIX_OWN_CHAIN_DATA = 0xb000;
export const STORE_PREFIX_CHANNEL_DATA = 0xa000;
export const STORE_PREFIX_CHAIN_VALIDATORS = 0x9000;
export const STORE_PREFIX_TERMINATED_STATE = 0xc000;
export const STORE_PREFIX_TERMINATED_OUTBOX = 0xd000;
export const STORE_PREFIX_REGISTERED_NAMES = 0xe000;
export const STORE_PREFIX_REGISTERED_NETWORK_IDS = 0xf000;

// Chain status
export const CHAIN_REGISTERED = 0;
export const CHAIN_ACTIVE = 1;
export const CHAIN_TERMINATED = 2;

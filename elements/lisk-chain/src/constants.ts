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

import { createMessageTag, hash } from '@liskhq/lisk-cryptography';

export const DEFAULT_KEEP_EVENTS_FOR_HEIGHTS = 300;
export const DEFAULT_MIN_BLOCK_HEADER_CACHE = 309;
export const DEFAULT_MAX_BLOCK_HEADER_CACHE = 515;

export const EMPTY_BUFFER = Buffer.alloc(0);
export const EMPTY_HASH = hash(EMPTY_BUFFER);

export const GENESIS_BLOCK_VERSION = 0;
export const GENESIS_BLOCK_GENERATOR_ADDRESS = EMPTY_BUFFER;
export const GENESIS_BLOCK_REWARD = BigInt(0);
export const GENESIS_BLOCK_SIGNATURE = EMPTY_BUFFER;
export const GENESIS_BLOCK_TRANSACTION_ROOT = EMPTY_HASH;

export const TAG_BLOCK_HEADER = createMessageTag('BH');
export const TAG_TRANSACTION = createMessageTag('TX');

// TODO: Actual size TBD
export const MAX_ASSET_DATA_SIZE_BYTES = 64;
export const SIGNATURE_LENGTH_BYTES = 64;

export const SMT_PREFIX_SIZE = 6;

export const EVENT_STANDARD_TYPE_ID = Buffer.alloc(4, 0);
export const EVENT_TOPIC_HASH_LENGTH_BYTES = 8;
export const EVENT_INDEX_LENGTH_BITS = 30;
export const EVENT_TOPIC_INDEX_LENGTH_BITS = 2;
export const EVENT_MAX_EVENT_SIZE_BYTES = 1024;

export const EVENT_TOTAL_INDEX_LENGTH_BYTES =
	(EVENT_INDEX_LENGTH_BITS + EVENT_TOPIC_INDEX_LENGTH_BITS) / 8;

export const EVENT_MAX_TOPICS_PER_EVENT = 2 ** EVENT_TOPIC_INDEX_LENGTH_BITS;
export const EVENT_KEY_LENGTH = EVENT_TOPIC_HASH_LENGTH_BYTES + EVENT_TOTAL_INDEX_LENGTH_BYTES;

export const MAX_EVENTS_PER_BLOCK = 2 ** EVENT_INDEX_LENGTH_BITS;
export const EVENT_ID_LENGTH_BYTES = 4 + EVENT_TOTAL_INDEX_LENGTH_BYTES;

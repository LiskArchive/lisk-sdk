/*
 * Copyright © 2020 Lisk Foundation
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

import { hash } from '@liskhq/lisk-cryptography';

export const EMPTY_BUFFER = Buffer.alloc(0);
export const EMPTY_HASH = hash(EMPTY_BUFFER);

export const GENESIS_BLOCK_VERSION = 0;
export const GENESIS_BLOCK_GENERATOR_PUBLIC_KEY = EMPTY_BUFFER;
export const GENESIS_BLOCK_REWARD = BigInt(0);
export const GENESIS_BLOCK_PAYLOAD = [];
export const GENESIS_BLOCK_SIGNATURE = EMPTY_BUFFER;
export const GENESIS_BLOCK_TRANSACTION_ROOT = EMPTY_HASH;
export const GENESIS_BLOCK_MAX_BALANCE = BigInt(2) ** BigInt(63) - BigInt(1);

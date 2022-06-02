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

import { hash } from '@liskhq/lisk-cryptography';

export const DEFAULT_RELEASE_LIMIT = 100;
export const DEFAULT_RELEASE_INTERVAL = 5000;
export const DEFAULT_RATE_LIMIT_FREQUENCY = 3;
export const FORGE_INTERVAL = 1000;
export const LOAD_TRANSACTION_RETRIES = 5;

export const NETWORK_RPC_GET_TRANSACTIONS = 'getTransactions';
export const NETWORK_EVENT_POST_TRANSACTIONS_ANNOUNCEMENT = 'postTransactionsAnnouncement';

export const GENERATOR_STORE_RESERVED_PREFIX = 0;

export const EMPTY_BUFFER = Buffer.alloc(0);
export const EMPTY_HASH = hash(Buffer.alloc(0));
export const GENESIS_BLOCK_VERSION = 0;

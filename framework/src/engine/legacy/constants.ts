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

export const DB_KEY_BLOCKS_ID = 'blocks:id';
export const DB_KEY_BLOCKS_HEIGHT = 'blocks:height';
export const DB_KEY_TRANSACTIONS_BLOCK_ID = 'transactions:blockID';
export const DB_KEY_TRANSACTIONS_ID = 'transactions:id';
export const DB_KEY_LEGACY_BRACKET = Buffer.from([2]);

// When no peer was found then resyncing after 12 seconds, 1000 * 12 ms
export const FAILED_SYNC_RETRY_TIMEOUT = 12000;
// To avoid syncing with the same peer frequently and get banned due to RPC limit, resync after 5 seconds, 5 * 1000 ms
export const SUCCESS_SYNC_RETRY_TIMEOUT = 5000;
export const MAX_FAILED_ATTEMPTS = 10;
export const ENGINE_LEGACY_MODULE_NAME = 'legacy';
export const LOG_OBJECT_ENGINE_LEGACY_MODULE = { engineModule: ENGINE_LEGACY_MODULE_NAME };

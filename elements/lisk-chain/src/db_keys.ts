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

import { intToBuffer } from '@liskhq/lisk-cryptography';
import { DB_KEY_PREFIX_BYTE_LENGTH } from './constants';

const dbKey = (n: number) => intToBuffer(n, DB_KEY_PREFIX_BYTE_LENGTH);

// 1-25 for chain state
export const DB_KEY_CHAIN_STATE = dbKey(1);
export const DB_KEY_CHAIN_STATE_BURNT_FEE = dbKey(2);
export const DB_KEY_BLOCKS_ID = dbKey(3);
export const DB_KEY_BLOCKS_HEIGHT = dbKey(4);
export const DB_KEY_TRANSACTIONS_BLOCK_ID = dbKey(5);
export const DB_KEY_TRANSACTIONS_ID = dbKey(6);
export const DB_KEY_TEMPBLOCKS_HEIGHT = dbKey(7);
export const DB_KEY_ACCOUNTS_ADDRESS = dbKey(8);

// 26-50 for consensus state
export const DB_KEY_CONSENSUS_STATE = dbKey(26);
export const DB_KEY_CONSENSUS_STATE_FINALIZED_HEIGHT = dbKey(27);
export const DB_KEY_CONSENSUS_STATE_VALIDATORS = dbKey(28);

// 51-75 for diff state
export const DB_KEY_DIFF_STATE = dbKey(51);

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

import { utils } from '@liskhq/lisk-cryptography';

export const CONSENSUS_EVENT_FORK_DETECTED = 'CONSENSUS_EVENT_FORK_DETECTED';
export const CONSENSUS_EVENT_BLOCK_BROADCAST = 'CONSENSUS_EVENT_BLOCK_BROADCAST';
export const CONSENSUS_EVENT_BLOCK_NEW = 'CONSENSUS_EVENT_BLOCK_NEW';
export const CONSENSUS_EVENT_NETWORK_BLOCK_NEW = 'CONSENSUS_EVENT_NETWORK_BLOCK_NEW';
export const CONSENSUS_EVENT_BLOCK_DELETE = 'CONSENSUS_EVENT_BLOCK_DELETE';
export const CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED = 'CONSENSUS_EVENT_FINALIZED_HEIGHT_CHANGED';
export const CONSENSUS_EVENT_VALIDATORS_CHANGED = 'CONSENSUS_EVENT_VALIDATORS_CHANGED';

export const NETWORK_EVENT_POST_BLOCK = 'postBlock';
export const NETWORK_EVENT_POST_NODE_INFO = 'postNodeInfo';
export const NETWORK_RPC_GET_LAST_BLOCK = 'getLastBlock';
export const NETWORK_RPC_GET_BLOCKS_FROM_ID = 'getBlocksFromId';
export const NETWORK_RPC_GET_HIGHEST_COMMON_BLOCK = 'getHighestCommonBlock';
export const NETWORK_RPC_GET_SINGLE_COMMIT_FROM_ID = 'getSingleCommit';

export const NETWORK_LEGACY_GET_BLOCKS = 'getLegacyBlocksFromId';

export const EMPTY_HASH = utils.hash(Buffer.alloc(0));

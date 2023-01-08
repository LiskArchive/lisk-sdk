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

import { MAX_CCM_SIZE } from 'lisk-sdk';

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#liveness-condition
export const CCU_FREQUENCY = 864000; // Approximately 10 days which is 33% of 1 month liveness condition
export const EMPTY_BYTES = Buffer.alloc(0);
export const MODULE_NAME_INTEROPERABILITY = 'interoperability';
export const COMMAND_NAME_SUBMIT_MAINCHAIN_CCU = 'submitMainchainCrossChainUpdate';
export const COMMAND_NAME_SUBMIT_SIDECHAIN_CCU = 'submitSidechainCrossChainUpdate';
export const CROSS_CHAIN_COMMAND_NAME_TRANSFER = 'crossChainTransfer';
export const CCM_SEND_SUCCESS = 'ccmSendSuccess';
export const ADDRESS_LENGTH = 20;
export const BLS_PUBLIC_KEY_LENGTH = 48;

export const DB_KEY_MAINCHAIN = Buffer.from([0]);
export const DB_KEY_SIDECHAIN = Buffer.from([1]);

export const DB_KEY_CROSS_CHAIN_MESSAGES = Buffer.from([1]);
export const DB_KEY_BLOCK_HEADERS = Buffer.from([2]);
export const DB_KEY_AGGREGATE_COMMITS = Buffer.from([3]);
export const DB_KEY_VALIDATORS_HASH_PREIMAGE = Buffer.from([4]);

/**
 * It’s not really MAX_CCU_SIZE, coz CCU includes other properties
 * It’s more max size of a CCM to be included in a mainchain block
 * MAX_CCM_SIZE

 * Max size of total CCM which can be included in a CCU
 * CCU_TOTAL_CCM_SIZE
 */
export const CCU_TOTAL_CCM_SIZE = MAX_CCM_SIZE;

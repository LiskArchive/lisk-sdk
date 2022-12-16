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

export const CCM_BASED_CCU_FREQUENCY = 10;
export const LIVENESS_BASED_CCU_FREQUENCY = 864000; // Approximately 10 days which is 33% of 1 month liveness condition
export const EMPTY_BYTES = Buffer.alloc(0);
export const MODULE_NAME_INTEROPERABILITY = 'interoperability';
export const CROSS_CHAIN_COMMAND_NAME_TRANSFER = 'crossChainTransfer';
export const CCM_SEND_SUCCESS = 'ccmSendSuccess';
export const DB_KEY_CROSS_CHAIN_MESSAGES = Buffer.from([0]);

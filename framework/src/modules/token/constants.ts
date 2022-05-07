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

export const MODULE_ID_TOKEN = 2;
export const COMMAND_ID_TRANSFER = 0;
export const CROSS_CHAIN_COMMAND_ID_TRANSFER = 0;
export const CROSS_CHAIN_COMMAND_ID_FORWARD = 1;

export const ADDRESS_LENGTH = 20;
export const MAX_DATA_LENGTH = 64;

export const MAX_TRANSACTION_AMOUNT = '9223372036854775807';
export const DEFAULT_MIN_REMAINING_BALANCE = '5000000';

export const STORE_PREFIX_USER = 0x0000;
export const STORE_PREFIX_SUPPLY = 0x8000;
export const STORE_PREFIX_ESCROW = 0xc000;
export const STORE_PREFIX_AVAILABLE_LOCAL_ID = 0xd000;
export const STORE_PREFIX_TERMINATED_ESCROW = 0xe000;

export const CCM_STATUS_OK = 0;
export const CCM_STATUS_TOKEN_NOT_SUPPORTED = 64;
export const CCM_STATUS_PROTOCOL_VIOLATION = 65;
export const CCM_STATUS_MIN_BALANCE_NOT_REACHED = 66;

export const MIN_BALANCE = BigInt(5000000);
export const MIN_RETURN_FEE = BigInt(1000);

export const CHAIN_ID_LENGTH = 4;
export const LOCAL_ID_LENGTH = 4;
export const TOKEN_ID_LENGTH = CHAIN_ID_LENGTH + LOCAL_ID_LENGTH;
export const LOCAL_ID_LSK = Buffer.alloc(LOCAL_ID_LENGTH, 0);
export const TOKEN_ID_LSK = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
export const CHAIN_ID_ALIAS_NATIVE = Buffer.alloc(CHAIN_ID_LENGTH, 0);

export const defaultConfig = {
	minBalances: [
		{
			tokenID: Buffer.alloc(TOKEN_ID_LENGTH, 0).toString('hex'),
			amount: DEFAULT_MIN_REMAINING_BALANCE,
		},
	],
	supportedTokenIDs: [],
};

export const EMPTY_BYTES = Buffer.alloc(0);

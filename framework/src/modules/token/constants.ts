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

export const CROSS_CHAIN_COMMAND_NAME_TRANSFER = 'crossChainTransfer';
export const CROSS_CHAIN_COMMAND_NAME_FORWARD = 'crossChainForward';

export const ADDRESS_LENGTH = 20;
export const MAX_DATA_LENGTH = 64;
export const MIN_MODULE_NAME_LENGTH = 1;
export const MAX_MODULE_NAME_LENGTH = 32;

export const MAX_TRANSACTION_AMOUNT = '9223372036854775807';
export const DEFAULT_MIN_REMAINING_BALANCE = '5000000';

export const CCM_STATUS_OK = 0;
export const CCM_STATUS_TOKEN_NOT_SUPPORTED = 64;
export const CCM_STATUS_PROTOCOL_VIOLATION = 65;
export const CCM_STATUS_MIN_BALANCE_NOT_REACHED = 66;

export const MIN_BALANCE = BigInt(5000000);
export const MIN_RETURN_FEE = BigInt(1000);
export const FEE_CCM_INIT_USER_STORE = BigInt(5000000);

export const CHAIN_ID_LENGTH = 4;
export const LOCAL_ID_LENGTH = 4;
export const TOKEN_ID_LENGTH = CHAIN_ID_LENGTH + LOCAL_ID_LENGTH;
export const LOCAL_ID_LSK = Buffer.alloc(LOCAL_ID_LENGTH, 0);
export const CHAIN_ID_LSK = Buffer.from([0, 0, 0, 0]);
export const TOKEN_ID_LSK = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
export const USER_SUBSTORE_INITIALIZATION_FEE = '5000000';
export const TOKEN_ID_STORE_INITIALIZATION = TOKEN_ID_LSK;

export const ESCROW_SUBSTORE_INITIALIZATION_FEE = BigInt(5000000);

export const defaultConfig = {
	minBalances: [
		{
			tokenID: Buffer.alloc(TOKEN_ID_LENGTH, 0).toString('hex'),
			amount: DEFAULT_MIN_REMAINING_BALANCE,
		},
	],
	accountInitializationFee: USER_SUBSTORE_INITIALIZATION_FEE,
};

export const EMPTY_BYTES = Buffer.alloc(0);

export const enum TokenEventResult {
	SUCCESSFUL = 0,
	FAIL_INSUFFICIENT_BALANCE = 1,
	FAIL_RECIPIENT_NOT_INITIALIZED = 2,
	INVALID_INITIALIZATION_FEE_VALUE = 3,
	DATA_TOO_LONG = 4,
	ESCROW_NOT_INITIALIZED = 5,
	INVALID_TOKEN_ID = 6,
	TOKEN_NOT_SUPPORTED = 7,
	RECOVER_FAIL_INVALID_INPUTS = 9,
	RECOVER_FAIL_INSUFFICIENT_ESCROW = 10,
	MINT_FAIL_NON_NATIVE_TOKEN = 11,
	MINT_FAIL_TOTAL_SUPPLY_TOO_BIG = 12,
	MINT_FAIL_TOKEN_NOT_INITIALIZED = 13,
	MAX_AVAILABLE_ID_REACHED = 14,
	INSUFFICIENT_ESCROW_BALANCE = 15,
}

export type TokenErrorEventResult = Exclude<TokenEventResult, TokenEventResult.SUCCESSFUL>;

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

export const ADDRESS_LENGTH = 20;
export const MAX_DATA_LENGTH = 64;
export const MIN_MODULE_NAME_LENGTH = 1;
export const MAX_MODULE_NAME_LENGTH = 32;

export const MAX_TRANSACTION_AMOUNT = '9223372036854775807';

export const CCM_STATUS_OK = 0;
export const CCM_STATUS_TOKEN_NOT_SUPPORTED = 64;
export const CCM_STATUS_PROTOCOL_VIOLATION = 65;

export const MIN_RETURN_FEE = BigInt(1000);

export const CHAIN_ID_LENGTH = 4;
export const HASH_LENGTH = 32;
export const LOCAL_ID_LENGTH = 4;
export const TOKEN_ID_LENGTH = CHAIN_ID_LENGTH + LOCAL_ID_LENGTH;
export const LOCAL_ID_LSK = Buffer.alloc(LOCAL_ID_LENGTH, 0);
export const USER_SUBSTORE_INITIALIZATION_FEE = BigInt(5000000);
export const ESCROW_SUBSTORE_INITIALIZATION_FEE = BigInt(5000000);

export const defaultConfig = {
	userAccountInitializationFee: USER_SUBSTORE_INITIALIZATION_FEE.toString(),
	escrowAccountInitializationFee: ESCROW_SUBSTORE_INITIALIZATION_FEE.toString(),
};

export const EMPTY_BYTES = Buffer.alloc(0);

export const enum TokenEventResult {
	SUCCESSFUL = 0,
	FAIL_INSUFFICIENT_BALANCE = 1,
	DATA_TOO_LONG = 2,
	INVALID_TOKEN_ID = 3,
	TOKEN_NOT_SUPPORTED = 4,
	INSUFFICIENT_LOCKED_AMOUNT = 5,
	RECOVER_FAIL_INVALID_INPUTS = 6,
	RECOVER_FAIL_INSUFFICIENT_ESCROW = 7,
	MINT_FAIL_NON_NATIVE_TOKEN = 8,
	MINT_FAIL_TOTAL_SUPPLY_TOO_BIG = 9,
	MINT_FAIL_TOKEN_NOT_INITIALIZED = 10,
	TOKEN_ID_NOT_AVAILABLE = 11,
	TOKEN_ID_NOT_NATIVE = 12,
	INSUFFICIENT_ESCROW_BALANCE = 13,
}

export type TokenErrorEventResult = Exclude<TokenEventResult, TokenEventResult.SUCCESSFUL>;

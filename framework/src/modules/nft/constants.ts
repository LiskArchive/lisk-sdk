/*
 * Copyright © 2023 Lisk Foundation
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

export const LENGTH_CHAIN_ID = 4;
export const LENGTH_NFT_ID = 16;
export const LENGTH_COLLECTION_ID = 4;
export const LENGTH_INDEX = LENGTH_NFT_ID - LENGTH_CHAIN_ID - LENGTH_COLLECTION_ID;
export const MIN_LENGTH_MODULE_NAME = 1;
export const MAX_LENGTH_MODULE_NAME = 32;
export const LENGTH_ADDRESS = 20;
export const MODULE_NAME_NFT = 'nft';
export const NFT_NOT_LOCKED = MODULE_NAME_NFT;
export const CROSS_CHAIN_COMMAND_NAME_TRANSFER = 'crossChainTransfer';
export const CCM_STATUS_CODE_OK = 0;
export const EMPTY_BYTES = Buffer.alloc(0);
export const ALL_SUPPORTED_NFTS_KEY = EMPTY_BYTES;
export const FEE_CREATE_NFT = 5000000;
export const LENGTH_TOKEN_ID = 8;
export const MAX_LENGTH_DATA = 64;

export const enum NftEventResult {
	RESULT_SUCCESSFUL = 0,
	RESULT_NFT_DOES_NOT_EXIST = 1,
	RESULT_NFT_NOT_NATIVE = 2,
	RESULT_NFT_NOT_SUPPORTED = 3,
	RESULT_NFT_LOCKED = 4,
	RESULT_NFT_NOT_LOCKED = 5,
	RESULT_UNAUTHORIZED_UNLOCK = 6,
	RESULT_NFT_ESCROWED = 7,
	RESULT_NFT_NOT_ESCROWED = 8,
	RESULT_INITIATED_BY_NONNATIVE_CHAIN = 9,
	RESULT_INITIATED_BY_NONOWNER = 10,
	RESULT_RECOVER_FAIL_INVALID_INPUTS = 11,
	RESULT_INSUFFICIENT_BALANCE = 12,
	RESULT_DATA_TOO_LONG = 13,
	INVALID_RECEIVING_CHAIN = 14,
	RESULT_INVALID_ACCOUNT = 15,
}

export type NftErrorEventResult = Exclude<NftEventResult, NftEventResult.RESULT_SUCCESSFUL>;

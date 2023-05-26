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
export const MIN_LENGTH_MODULE_NAME = 1;
export const MAX_LENGTH_MODULE_NAME = 32;
export const LENGTH_ADDRESS = 20;

export const enum NftEventResult {
	SUCCESSFUL = 0,
	NFT_DOES_NOT_EXIST = 1,
	NFT_NOT_NATIVE = 2,
	NFT_NOT_SUPPORTED = 3,
	NFT_LOCKED = 4,
	NFT_NOT_LOCKED = 5,
	UNAUTHORIZED_UNLOCK = 6,
	NFT_ESCROWED = 7,
	NFT_NOT_ESCROWED = 8,
	INITIATED_BY_NONNATIVE_CHAIN = 9,
	INITIATED_BY_NONOWNER = 10,
	RECOVER_FAIL_INVALID_INPUTS = 11,
	INSUFFICIENT_BALANCE = 12,
	DATA_TOO_LONG = 13,
}

export type NFTErrorEventResult = Exclude<NftEventResult, NftEventResult.SUCCESSFUL>;

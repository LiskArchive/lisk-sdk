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

const MIN_FEE_PER_BYTE = 1000;
const MAX_BLOCK_HEIGHT_ZERO_FEE_PER_BYTE = 0;

export const defaultConfig = {
	minFeePerByte: MIN_FEE_PER_BYTE,
	maxBlockHeightZeroFeePerByte: MAX_BLOCK_HEIGHT_ZERO_FEE_PER_BYTE,
};

export const CONTEXT_STORE_KEY_AVAILABLE_FEE = 'CONTEXT_STORE_KEY_AVAILABLE_FEE';
export const CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE = 'CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE';
export const HASH_LENGTH = 32;

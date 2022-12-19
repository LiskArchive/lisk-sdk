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
 *
 */
import { MAX_UINT64 } from '@liskhq/lisk-validator';

const FIXED_POINT = 10 ** 8;
const LISK_MAX_DECIMAL_POINTS = 8;
const getDecimalPlaces = (amount: string): number =>
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	(amount.split('.')[1] || '').length;

/**
 * Converts a given amount of Beddows to LSK.
 * 1 LSK = 10^8 Beddows.
 *
 *  @example
 *  ```ts
 *  const lskAmount = convertBeddowsToLSK("150000000");
 *  ```
 *
 * @param beddowsAmount Amount in Beddows
 *
 * */
export const convertBeddowsToLSK = (beddowsAmount?: string): string => {
	if (typeof beddowsAmount !== 'string') {
		throw new Error('Cannot convert non-string amount');
	}
	if (getDecimalPlaces(beddowsAmount)) {
		throw new Error('Beddows amount should not have decimal points');
	}
	const beddowsAmountBigInt = BigInt(beddowsAmount);
	if (beddowsAmountBigInt > MAX_UINT64) {
		throw new Error('Beddows amount out of range');
	}
	const int = (beddowsAmountBigInt / BigInt(FIXED_POINT)).toString();
	const floating = Number(beddowsAmountBigInt % BigInt(FIXED_POINT)) / FIXED_POINT;
	const floatingPointsSplit = floating
		.toLocaleString('en-US', {
			maximumFractionDigits: LISK_MAX_DECIMAL_POINTS,
		})
		.split('.')[1];
	const res = floating !== 0 ? `${int}.${floatingPointsSplit}` : int;

	return res;
};

/**
 * Converts a given amount of Beddows to LSK.
 * 1 LSK = 10^8 Beddows.
 *
 *  @example
 *  ```ts
 *  const lskAmount = convertLSKToBeddows("15");
 *  ```
 *
 * @param lskAmount Amount in LSK
 *
 * */
export const convertLSKToBeddows = (lskAmount?: string): string => {
	if (typeof lskAmount !== 'string') {
		throw new Error('Cannot convert non-string amount');
	}
	if (getDecimalPlaces(lskAmount) > LISK_MAX_DECIMAL_POINTS) {
		throw new Error('LSK amount has too many decimal points');
	}
	const splitAmount = lskAmount.split('.');
	const liskAmountInt = BigInt(splitAmount[0]);
	const liskAmountFloatBigInt = BigInt(
		(splitAmount[1] ?? '0').padEnd(LISK_MAX_DECIMAL_POINTS, '0'),
	);
	const beddowsAmountBigInt = liskAmountInt * BigInt(FIXED_POINT) + liskAmountFloatBigInt;
	if (beddowsAmountBigInt > MAX_UINT64) {
		throw new Error('LSK amount out of range');
	}

	return beddowsAmountBigInt.toString();
};

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
import * as BigNum from '@liskhq/bignum';
import { FIXED_POINT } from '../constants';
import { isGreaterThanMaxTransactionAmount } from './validation';

const BASE_10 = 10;
const LISK_MAX_DECIMAL_POINTS = 8;
const getDecimalPlaces = (amount: string): number =>
	(amount.split('.')[1] || '').length;

export const convertBeddowsToLSK = (beddowsAmount?: string): string => {
	if (typeof beddowsAmount !== 'string') {
		throw new Error('Cannot convert non-string amount');
	}
	if (getDecimalPlaces(beddowsAmount)) {
		throw new Error('Beddows amount should not have decimal points');
	}
	const beddowsAmountBigNum = new BigNum(beddowsAmount);
	if (isGreaterThanMaxTransactionAmount(beddowsAmountBigNum)) {
		throw new Error('Beddows amount out of range');
	}
	const lskAmountBigNum = beddowsAmountBigNum.div(FIXED_POINT);

	return lskAmountBigNum.toString(BASE_10);
};

export const convertLSKToBeddows = (lskAmount?: string): string => {
	if (typeof lskAmount !== 'string') {
		throw new Error('Cannot convert non-string amount');
	}
	if (getDecimalPlaces(lskAmount) > LISK_MAX_DECIMAL_POINTS) {
		throw new Error('LSK amount has too many decimal points');
	}
	const lskAmountBigNum = new BigNum(lskAmount);
	const beddowsAmountBigNum = lskAmountBigNum.mul(FIXED_POINT);
	if (isGreaterThanMaxTransactionAmount(beddowsAmountBigNum)) {
		throw new Error('LSK amount out of range');
	}

	return beddowsAmountBigNum.toString();
};

export const prependPlusToPublicKeys = (
	publicKeys: ReadonlyArray<string>,
): ReadonlyArray<string> => publicKeys.map(publicKey => `+${publicKey}`);

export const prependMinusToPublicKeys = (
	publicKeys: ReadonlyArray<string>,
): ReadonlyArray<string> => publicKeys.map(publicKey => `-${publicKey}`);

/*
 * Copyright © 2018 Lisk Foundation
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
import bignum from 'browserify-bignum';
import { FIXED_POINT } from '../constants';
import { isGreaterThanMaxTransactionAmount } from './validation';

const getDecimalPlaces = amount => (amount.split('.')[1] || '').length;

export const convertBeddowsToLSK = beddowsAmount => {
	if (typeof beddowsAmount !== 'string') {
		throw new Error('Cannot convert non-string amount');
	}
	if (getDecimalPlaces(beddowsAmount)) {
		throw new Error('Beddows amount should not have decimal points');
	}
	const beddowsAmountBigNum = bignum(beddowsAmount);
	if (isGreaterThanMaxTransactionAmount(beddowsAmountBigNum)) {
		throw new Error('Beddows amount out of range');
	}
	const lskAmountBigNum = beddowsAmountBigNum.div(FIXED_POINT);
	return lskAmountBigNum.toString(10);
};

export const convertLSKToBeddows = lskAmount => {
	if (typeof lskAmount !== 'string') {
		throw new Error('Cannot convert non-string amount');
	}
	if (getDecimalPlaces(lskAmount) > 8) {
		throw new Error('LSK amount has too many decimal points');
	}
	const lskAmountBigNum = bignum(lskAmount);
	const beddowsAmountBigNum = lskAmountBigNum.mul(FIXED_POINT);
	if (isGreaterThanMaxTransactionAmount(beddowsAmountBigNum)) {
		throw new Error('LSK amount out of range');
	}
	return beddowsAmountBigNum.toString();
};

export const prependPlusToPublicKeys = publicKeys =>
	publicKeys.map(publicKey => `+${publicKey}`);

export const prependMinusToPublicKeys = publicKeys =>
	publicKeys.map(publicKey => `-${publicKey}`);

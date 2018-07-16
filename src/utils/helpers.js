/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { ValidationError } from '../utils/error';

const regExpAmount = /^\d+(\.\d{1,8})?$/;

const isStringInteger = n => {
	const parsed = parseInt(n, 10);
	return !Number.isNaN(parsed) && parsed.toString() === n;
};

export const validateLifetime = lifetime => {
	if (!isStringInteger(lifetime)) {
		throw new ValidationError('Lifetime must be an integer.');
	}
	return true;
};

export const validateMinimum = minimum => {
	if (!isStringInteger(minimum)) {
		throw new ValidationError(
			'Minimum number of signatures must be an integer.',
		);
	}
	return true;
};

export const validateAmount = amount => {
	if (!amount.match(regExpAmount)) {
		throw new ValidationError(
			'Amount must be a number with no more than 8 decimal places.',
		);
	}
	return true;
};

export const createErrorHandler = prefix => ({ message }) => ({
	error: `${prefix}: ${message}`,
});

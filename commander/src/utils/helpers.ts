/*
 * LiskHQ/lisk-commander
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
import { ValidationError } from '../utils/error';

const regExpAmount = /^\d+(\.\d{1,8})?$/;

const isStringInteger = (n: string): boolean => {
	const parsed = parseInt(n, 10);

	return !Number.isNaN(parsed) && parsed.toString() === n;
};

export const validateLifetime = (lifetime: string): boolean => {
	if (!isStringInteger(lifetime)) {
		throw new ValidationError('Lifetime must be an integer.');
	}

	return true;
};

export const validateMinimum = (minimum: string): boolean => {
	if (!isStringInteger(minimum)) {
		throw new ValidationError(
			'Minimum number of signatures must be an integer.',
		);
	}

	return true;
};

export const validateAmount = (amount: string): boolean => {
	if (!amount.match(regExpAmount)) {
		throw new ValidationError(
			'Amount must be a number with no more than 8 decimal places.',
		);
	}

	return true;
};

interface ErrorMessageObject {
	readonly error: string;
}

export const createErrorHandler = (prefix: string) => ({
	message,
}: {
	readonly message: string;
}): ErrorMessageObject => ({
	error: `${prefix}: ${message}`,
});

interface ErrorObject {
	readonly errno: string | number;
}

export const handleEPIPE = (err: ErrorObject) => {
	if (err.errno !== 'EPIPE') {
		throw err;
	}
};

export const stdoutIsTTY = (): true | undefined => process.stdout.isTTY;

export const stdinIsTTY = (): true | undefined => process.stdin.isTTY;

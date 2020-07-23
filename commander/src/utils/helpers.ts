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

export const handleEPIPE = (err: ErrorObject): void => {
	if (err.errno !== 'EPIPE') {
		throw err;
	}
};

export const stdoutIsTTY = (): boolean => process.stdout.isTTY;

export const stdinIsTTY = (): boolean => process.stdin.isTTY;

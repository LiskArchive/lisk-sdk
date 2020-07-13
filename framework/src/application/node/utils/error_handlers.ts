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
 */

export class CommonBlockError extends Error {
	public lastBlockID: string;

	public constructor(message: string, lastBlockID: Buffer) {
		super(message);
		this.lastBlockID = lastBlockID.toString('base64');
	}
}

export const convertErrorsToString = (errors?: string | Error | ReadonlyArray<Error>): string => {
	if (Array.isArray(errors) && errors.length > 0) {
		return errors
			.filter((e: Error) => e instanceof Error)
			.map((error: Error) => error.message)
			.join(', ');
	}

	if (errors instanceof Error) {
		return errors.message;
	}

	if (typeof errors === 'string') {
		return errors;
	}

	return '';
};

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
export class TransactionError extends Error {
	public message: string;
	public id: Buffer;
	public dataPath: string;
	public actual?: string | number;
	public expected?: string | number;
	public constructor(
		message = '',
		id = Buffer.from(''),
		dataPath = '',
		actual?: string | number,
		expected?: string | number,
	) {
		super();
		this.message = message;
		this.name = 'TransactionError';
		this.id = id;
		this.dataPath = dataPath;
		this.actual = actual;
		this.expected = expected;
	}

	public toString(): string {
		const defaultMessage = `Transaction: ${this.id.toString('base64')} failed at ${
			this.dataPath
		}: ${this.message}`;
		const withActual = this.actual
			? // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			  `${defaultMessage}, actual: ${this.actual}`
			: defaultMessage;
		const withExpected = this.expected
			? // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			  `${withActual}, expected: ${this.expected}`
			: withActual;

		return withExpected;
	}
}

interface ErrorObject {
	readonly dataPath?: string;
	readonly message?: string;
}

export const convertToTransactionError = (
	id: Buffer,
	errors: ReadonlyArray<ErrorObject> | null | undefined,
): ReadonlyArray<TransactionError> => {
	if (!errors) {
		return [];
	}

	return errors.map(
		error =>
			new TransactionError(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`'${error.dataPath}' ${error.message}`,
				id,
				error.dataPath,
			),
	);
};

export const convertToAssetError = (
	id: Buffer,
	errors: ReadonlyArray<ErrorObject> | null | undefined,
): ReadonlyArray<TransactionError> => {
	if (!errors) {
		return [];
	}

	return errors.map(
		error =>
			new TransactionError(
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,@typescript-eslint/restrict-template-expressions
				`'${error.dataPath ?? '.asset'}' ${error.message}`,
				id,
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				error.dataPath ?? '.asset',
			),
	);
};

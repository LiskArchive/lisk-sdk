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
// tslint:disable max-classes-per-file
export class TransactionError extends Error {
	public message: string;
	public id: string;
	public dataPath: string;
	public actual?: string | number;
	public expected?: string | number;
	public constructor(
		message: string = '',
		id: string = '',
		dataPath: string = '',
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
		const defaultMessage = `Transaction: ${this.id} failed at ${
			this.dataPath
		}: ${this.message}`;
		const withActual = this.actual
			? `${defaultMessage}, actual: ${this.actual}`
			: defaultMessage;
		const withExpected = this.expected
			? `${withActual}, expected: ${this.expected}`
			: withActual;

		return withExpected;
	}
}

export class TransactionPendingError extends TransactionError {
	public id: string;
	public dataPath: string;
	public constructor(
		message: string = '',
		id: string = '',
		dataPath: string = '',
	) {
		super(message);
		this.name = 'TransactionPendingError';
		this.id = id;
		this.dataPath = dataPath;
	}

	public toString(): string {
		return `Transaction: ${this.id} failed at ${this.dataPath}: ${
			this.message
		} `;
	}
}

interface ErrorObject {
	readonly dataPath: string;
	readonly message?: string;
}

export const convertToTransactionError = (
	id: string,
	errors: ReadonlyArray<ErrorObject> | null | undefined,
): ReadonlyArray<TransactionError> => {
	if (!errors) {
		return [];
	}

	return errors.map(
		error =>
			new TransactionError(
				`'${error.dataPath}' ${error.message}`,
				id,
				error.dataPath,
			),
	);
};

export const convertToAssetError = (
	id: string,
	errors: ReadonlyArray<ErrorObject> | null | undefined,
): ReadonlyArray<TransactionError> => {
	if (!errors) {
		return [];
	}

	return errors.map(
		error =>
			new TransactionError(
				`'${error.dataPath || '.asset'}' ${error.message}`,
				id,
				error.dataPath || '.asset',
			),
	);
};

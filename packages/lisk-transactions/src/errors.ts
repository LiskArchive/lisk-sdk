// tslint:disable max-classes-per-file
import { VError } from 'verror';

export class TransactionError extends VError {
	public id: string;
	public dataPath: string;
	public actual?: string | number | object;
	public expected?: string | number | object;
	public constructor(
		message: string = '',
		id: string = '',
		dataPath: string = '',
		actual?: string | number | object,
		expected?: string | number | object,
	) {
		super(message);
		this.name = 'TransactionError';
		this.id = id;
		this.dataPath = dataPath;
		this.actual = actual;
		this.expected = expected;
	}

	public toString(): string {
		return `Transaction: ${this.id} failed at ${this.dataPath}: ${
			this.message
		} `;
	}
}

export class TransactionMultiError extends TransactionError {
	public id: string;
	public dataPath: string;
	public errors: ReadonlyArray<TransactionError>;
	public constructor(
		message: string = '',
		id: string = '',
		errors: ReadonlyArray<TransactionError> = [],
	) {
		super(message);
		this.name = 'TransactionMultiError';
		this.id = id;
		this.dataPath = errors.map(error => error.dataPath).join(',');
		this.errors = errors;
	}

	public toString(): string {
		return `Transaction: ${this.id} failed at ${this.dataPath}: ${
			this.message
		} `;
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

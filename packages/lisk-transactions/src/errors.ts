// tslint:disable max-classes-per-file
import { VError } from 'verror';

export class TransactionError extends VError {
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
		super(message);
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

export class TransactionMultiError extends TransactionError {
	public id: string;
	public errors: ReadonlyArray<TransactionError>;
	public constructor(
		message: string = '',
		id: string = '',
		errors: ReadonlyArray<TransactionError> = [],
	) {
		super(message);
		this.name = 'TransactionMultiError';
		this.id = id;
		this.errors = errors;
	}

	public toString(): string {
		const errMessages = this.errors.reduce(
			(prev, current) => `${prev}, ${current.toString()}`,
			'',
		);

		return `Transaction: ${this.id} failed: ${
			this.message
		} with errors ${errMessages}`;
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

// tslint:disable max-classes-per-file
import { VError } from 'verror';

export class TransactionError extends VError {
	public id: string;
	public dataPath: string;
	public constructor(
		message: string = '',
		id: string = '',
		dataPath: string = '',
	) {
		super(message);
		this.name = 'Transaction Error';
		this.id = id;
		this.dataPath = dataPath;
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
		this.name = 'Transaction MultiError';
		this.id = id;
		this.dataPath = errors.map(error => error.dataPath).join(':');
		this.errors = errors;
	}
}

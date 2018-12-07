// tslint:disable max-classes-per-file
import { VError } from 'verror';

export class TransactionError extends VError {
	public dataPath: string;
	public id: string;
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
	public errors: ReadonlyArray<TransactionError>;
	public constructor(
		message: string = '',
		errors: ReadonlyArray<TransactionError> = [],
	) {
		super(message);
		this.name = 'Transaction Error';
		this.errors = errors;
	}
}

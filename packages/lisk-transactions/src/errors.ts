import { VError } from 'verror';

export class TransactionError extends VError {
	public dataPath?: string;
	public constructor(message?: string, dataPath?: string) {
		super(message || '');
		this.name = 'Transaction Error';
		this.dataPath = dataPath || '';
	}
}

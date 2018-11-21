import { VError } from 'verror';

export class TransactionError extends VError {
	public id?: string;
	public dataPath?: string;
	public constructor(message?: string, id?: string, dataPath?: string) {
		super(message || '');
		this.name = 'Transaction Error';
		this.id = id || '';
		this.dataPath = dataPath || '';
	}
}

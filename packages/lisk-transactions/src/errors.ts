import { VError } from 'verror';

export class TransactionError extends VError {
	public dataPath: string;
	public id: string;
	public constructor(message: string = '', id: string = '', dataPath: string = '') {
		super(message);
		this.name = 'Transaction Error';
		this.id = id;
		this.dataPath = dataPath;
	}
}

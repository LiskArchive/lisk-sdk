import { VError } from 'verror';

export class BlockchainError extends VError {
	public id?: string;
	public dataPath?: string;

	public constructor(message: string, id?: string, dataPath?: string) {
		super(message);
		this.id = id;
		this.dataPath = dataPath;
	}
}

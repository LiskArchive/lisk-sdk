import { VError } from 'verror';

const defaultErrorNo = 500;

export class APIError extends VError {
	public errno?: number;
	public constructor(message?: string, errno?: number) {
		super(message || '');
		this.errno = errno || defaultErrorNo;
	}
}

import { VError } from 'verror';

export class NotEnoughPeersError extends VError {
	public constructor(message?: string) {
		super(message || '');
		this.name = 'Not Enough Peers Error';
	}
}

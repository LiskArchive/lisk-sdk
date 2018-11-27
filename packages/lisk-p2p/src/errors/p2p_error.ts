export class P2PError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'P2PError';
	}
}

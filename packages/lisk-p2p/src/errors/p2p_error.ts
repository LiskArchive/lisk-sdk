export class P2PError extends Error {
	private readonly _name: string;

	public constructor(message: string, errorName?: string) {
		super(message);
		this._name = errorName ? errorName : 'P2PError';
	}

	public get name(): string {
		return this._name;
	}
}

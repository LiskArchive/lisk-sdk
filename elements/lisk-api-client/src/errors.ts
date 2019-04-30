const defaultErrorNo = 500;

export interface APIErrorData {
	readonly code?: string;
	readonly message?: string;
}

export class APIError extends Error {
	public errno: number;
	public errors?: ReadonlyArray<APIErrorData>;

	public constructor(
		message: string = '',
		errno: number = defaultErrorNo,
		errors?: ReadonlyArray<APIErrorData>,
	) {
		super(message);
		this.name = 'APIError';
		this.errno = errno;
		this.errors = errors;
	}
}

export class Job<T> {
	// tslint:disable-next-line variable-name
	private _id: NodeJS.Timer | undefined;
	// tslint:disable-next-line variable-name
	private readonly _interval: number;
	// tslint:disable-next-line variable-name
	private readonly _job: () => Promise<T>;

	public constructor(
		context: object,
		job: () => Promise<T>,
		interval: number,
	) {
		this._interval = interval;
		this._job = job.bind(context);
	}

	public start(): void {
		if (typeof this._id === 'undefined') {
			this._id = setInterval(this._job, this._interval);
		}
	}

	public stop(): void {
		if (typeof this._id !== 'undefined') {
			clearInterval(this._id);
			this._id = undefined;
		}
	}
}
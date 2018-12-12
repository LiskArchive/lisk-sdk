export class Job<T> {
	private _execute = false;
	private _id: NodeJS.Timer | undefined;
	private readonly _interval: number;
	private readonly _job: () => Promise<T>;

	public constructor(
		context: object,
		job: () => Promise<T>,
		interval: number,
	) {
		this._interval = interval;
		this._job = job.bind(context);
	}

	public async start(): Promise<void> {
		if (this._id  === undefined && this._execute === false) {
			this._execute = true;

			return this.run();
		}
	}

	public stop(): void {
		if (this._id  !== undefined && this._execute === true) {
			clearTimeout(this._id);
			this._id = undefined;
			this._execute = false;
		}
	}

	private async callJobAfterTimeout(): Promise<void> {
		return new Promise<void>(resolve => {
			this._id = setTimeout(async () => {
				await this._job();

				return resolve();
			}, this._interval);
		});
	}

	private async run(): Promise<void> {
		// Base case for recursive function
		if (!this._execute) {
			return;
		}
		await this.callJobAfterTimeout();

		return this.run();
	}
}
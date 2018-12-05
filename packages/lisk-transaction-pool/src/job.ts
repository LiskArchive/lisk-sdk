import { Transaction } from "./transaction_pool";

export class Job {
	// tslint:disable-next-line variable-name
	private _id: NodeJS.Timer | undefined;
	// tslint:disable-next-line variable-name
	private readonly _interval: number;
	// tslint:disable-next-line variable-name
	private readonly _job: () => Promise<ReadonlyArray<Transaction>>;

	public constructor(
		context: object,
		job: () => Promise<ReadonlyArray<Transaction>>,
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
		if (typeof this._id === 'undefined') {
			clearInterval(this._id);
			this._id = undefined;
		}
	}
}
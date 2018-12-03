import { Transaction } from "./transaction_pool";

export class Job {
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
		this.start();
	}

	public start(): void {
		setInterval(this._job, this._interval);
	}
}
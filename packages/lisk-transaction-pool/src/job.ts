type SynchronousJob = () => void;
type AsynchronousJob = () => Promise<void>;

export class Job {
	// tslint:disable-next-line variable-name
	private readonly _interval: number;
	// tslint:disable-next-line variable-name
	private readonly _job: SynchronousJob | AsynchronousJob;

	public constructor(
		context: object,
		job: SynchronousJob | AsynchronousJob,
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

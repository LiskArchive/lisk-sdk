/*
 * Copyright © 2020 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
export class Job<T> {
	private _active = false;
	private _id: NodeJS.Timer | undefined;
	private readonly _interval: number;
	private readonly _job: () => Promise<T>;

	public constructor(job: () => Promise<T>, interval: number) {
		this._interval = interval;
		this._job = job;
	}

	// eslint-disable-next-line consistent-return
	public async start(): Promise<void> {
		if (!this._active) {
			this._active = true;

			return this.run();
		}
	}

	public stop(): void {
		if (this._active && this._id !== undefined) {
			clearTimeout(this._id);
			this._id = undefined;
			this._active = false;
		}
	}

	private async callJobAfterTimeout(): Promise<void> {
		return new Promise<void>(resolve => {
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			this._id = setTimeout(async () => {
				await this._job();
				resolve();
			}, this._interval);
		});
	}

	private async run(): Promise<void> {
		while (this._active) {
			await this.callJobAfterTimeout();
		}
	}
}

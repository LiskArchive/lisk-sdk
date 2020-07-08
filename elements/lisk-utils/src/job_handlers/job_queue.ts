/*
 * Copyright © 2019 Lisk Foundation
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
 */

import * as util from 'util';

const defaultConfig = {
	onWarning: undefined,
	warningLimit: 50,
};

const defaultTickInterval = 1;

interface Config {
	onWarning?: (length: number, limit: number) => void;
	warningLimit: number;
}

interface WorkerResult<T> {
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
}

interface Task<T = unknown> {
	worker: () => Promise<T>;
	done: WorkerResult<T>;
}

interface JobQueueConfig {
	readonly warningLimit?: number;
	readonly onWarning?: (length: number, limit: number) => void;
}

export class JobQueue {
	private readonly _config: Config;
	private readonly _queue: Task[] = [];

	public constructor(config?: JobQueueConfig) {
		this._queue = [];
		this._config = {
			// eslint-disable-next-line @typescript-eslint/unbound-method
			onWarning: config?.onWarning ?? defaultConfig.onWarning,
			warningLimit: config?.warningLimit ?? defaultConfig.warningLimit,
		};

		const nextJobQueue = async (): Promise<void> => {
			if (this._config.onWarning && this._queue.length >= this._config.warningLimit) {
				this._config.onWarning(this._queue.length, this._config.warningLimit);
			}
			await this._tick();
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			setTimeout(nextJobQueue, defaultTickInterval);
		};

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		nextJobQueue();
	}

	public async add<T>(worker: () => Promise<T>): Promise<T> {
		if (!util.types.isAsyncFunction(worker)) {
			throw new Error('Worker must be an async function.');
		}
		// Initialize for Typescript
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		let done: WorkerResult<T> = { resolve: () => {}, reject: () => {} };
		const workerPromise = new Promise<T>((resolve, reject) => {
			done = { resolve, reject };
		});
		const task: Task<T> = { worker, done };
		this._queue.push(task as Task);

		return workerPromise;
	}

	public count(): number {
		return this._queue.length;
	}

	private async _tick(): Promise<void> {
		const task = this._queue.shift();
		if (!task) {
			return;
		}
		try {
			const result = await task.worker();
			task.done.resolve(result);
		} catch (error) {
			task.done.reject(error);
		}
	}
}

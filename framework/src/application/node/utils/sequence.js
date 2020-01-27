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

'use strict';

const util = require('util');

const defaultConfig = {
	onWarning: null,
	warningLimit: 50,
};

const defaultTickInterval = 3;

class Sequence {
	constructor({ onWarning, warningLimit } = defaultConfig) {
		this.queue = [];
		this.config = {
			onWarning,
			warningLimit,
		};

		const nextSequence = async () => {
			if (
				this.config.onWarning &&
				this.queue.length >= this.config.warningLimit
			) {
				this.config.onWarning(this.queue.length, this.config.warningLimit);
			}
			await this._tick();
			setTimeout(nextSequence, defaultTickInterval);
		};

		nextSequence();
	}

	async _tick() {
		const task = this.queue.shift();
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

	add(worker) {
		if (!util.types.isAsyncFunction(worker)) {
			throw new Error('Worker must be an async function.');
		}
		let done;
		const workerPromise = new Promise((resolve, reject) => {
			done = { resolve, reject };
		});
		const task = { worker, done };
		this.queue.push(task);
		return workerPromise;
	}

	count() {
		return this.queue.length;
	}
}

module.exports = { Sequence };

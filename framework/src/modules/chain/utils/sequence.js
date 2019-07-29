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

/**
 * Creates a FIFO queue array and default settings with config values.
 * Calls __tick with 3
 *
 * @class
 * @memberof utils
 * @requires util
 * @param {string} config
 * @see Parent: {@link utils}
 * @todo Add description for the params
 */
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

	/**
	 * Removes the first task from queue and execute it with args.
	 *
	 * @param {function} cb
	 * @returns {setImmediateCallback} With cb or task.done
	 * @todo Add description for the params
	 */
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

	/**
	 * Adds a new task to queue.
	 *
	 * @param {function} worker
	 * @param {Array} args
	 * @param {function} done
	 * @todo Add description for the params
	 */
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

	/**
	 * Gets pending task in queue.
	 *
	 * @returns {number} Sequence length
	 */
	count() {
		return this.queue.length;
	}
}

module.exports = { Sequence };

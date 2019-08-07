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

/**
 * Util module for creating a jobs queue
 *
 * @module
 * @see Parent: {@link utils}
 * @requires child_process
 */

const assert = require('assert');
const util = require('util');

/**
 * Description of the namespace.
 *
 * @namespace jobsQueue
 * @memberof module:utils/jobs_queue
 * @see Parent: {@link utils~jobsQueue}
 */
const jobsQueue = {
	jobs: {},

	/**
	 * Returns hash of the last git commit if available.
	 *
	 * @param {string} name
	 * @param { } job
	 * @param {number} time
	 * @throws {Error} If cannot get last git commit
	 * @returns {string} Hash of last git commit
	 * @todo Add description for the params
	 */
	register(name, job, time) {
		// Check if job is already registered - we check only if property exists, because value can be undefined
		if (hasOwnProperty.call(this.jobs, name)) {
			throw new Error(`Synchronous job ${name} already registered`);
		}

		assert(typeof name === 'string', 'Name argument must be a string');
		assert(Number.isInteger(time), 'Time argument must be integer');
		assert(job instanceof Function, 'Job must be an instance of Function');
		if (!util.types.isAsyncFunction(job)) {
			assert(job.length === 1, 'Job function should have callback argument');
		} else {
			assert(job.length === 0, 'Job async function should not have arguments');
		}

		const nextJob = () => {
			const nextJobStep = () => {
				jobsQueue.jobs[name] = setTimeout(nextJob, time);
			};

			if (util.types.isAsyncFunction(job)) {
				return job().then(nextJobStep);
			}

			return job(nextJobStep);
		};

		jobsQueue.jobs[name] = nextJob();
		return jobsQueue.jobs[name];
	},
};

module.exports = jobsQueue;

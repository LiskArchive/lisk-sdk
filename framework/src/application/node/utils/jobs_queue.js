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

const assert = require('assert');
const util = require('util');

const jobsQueue = {
	jobs: {},

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

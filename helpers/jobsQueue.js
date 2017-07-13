'use strict';

var jobsQueue = {

	jobs: {},

	register: function (name, job, time) {
		// Check if job is already registered - we check only if property exists, because value can be undefined
		if (hasOwnProperty.call(this.jobs, name)) {
			throw new Error('Synchronous job ' + name  + ' already registered');
		}

		// Check if job is function, name is string and time is integer
		if (!job || Object.prototype.toString.call(job) !== '[object Function]' || typeof name !== 'string' || !Number.isInteger(time)) {
			throw new Error('Syntax error - invalid parameters supplied');
		}

		var nextJob = function () {
			return job(function () {
				jobsQueue.jobs[name] = setTimeout(nextJob, time);
			});
		};

		jobsQueue.jobs[name] = nextJob();
		return jobsQueue.jobs[name];
	}

};

module.exports = jobsQueue;

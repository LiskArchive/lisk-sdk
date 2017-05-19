'use strict';

var jobsQueue = {

	jobs: {},

	register: function (name, job, time) {
		if (this.jobs[name]) {
			throw new Error('Synchronous job ' + name  + ' already registered');
		}

		var nextJob = function () {
			setImmediate(job);
			jobsQueue.jobs[name] = setTimeout(nextJob, time);
		};

		nextJob();
		return this.jobs[name];
	}

};

module.exports = jobsQueue;

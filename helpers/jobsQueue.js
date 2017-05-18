'use strict';

var jobsQueue = {

	jobsSet: {},

	register: function (name, job, time) {
		if (this.jobsSet[name]) {
			throw new Error('Synchronous job ' + name  + ' already registered');
		}

		this.jobsSet[name] = setInterval(job, time);
		return this.jobsSet[name];
	}

};

module.exports = jobsQueue;

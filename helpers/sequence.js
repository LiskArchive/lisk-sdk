'use strict';

var extend = require('extend');
var util = require('util');

/**
 * Creates a FIFO sequence array and default settings with config values.
 * Calls __tick with 3 
 * @memberof module:helpers
 * @constructor
 * @param {string} config
 */
function Sequence (config) {
	var _default = {
		onWarning: null,
		warningLimit: 50
	};
	_default = extend(_default, config);
	var self = this;
	this.sequence = [];

	setImmediate(function nextSequenceTick () {
		if (_default.onWarning && self.sequence.length >= _default.warningLimit) {
			_default.onWarning(self.sequence.length, _default.warningLimit);
		}
		self.__tick(function () {
			setTimeout(nextSequenceTick, 3);
		});
	});
}

/**
 * Removes the first task from sequence and execute it with args.
 * @param {function} cb
 * @return {setImmediateCallback} With cb or task.done
 */
Sequence.prototype.__tick = function (cb) {
	var task = this.sequence.shift();
	if (!task) {
		return setImmediate(cb);
	}
	var args = [function (err, res) {
		if (task.done) {
			setImmediate(task.done, err, res);
		}
		setImmediate(cb);
	}];
	if (task.args) {
		args = args.concat(task.args);
	}
	task.worker.apply(task.worker, args);
};

/**
 * Adds a new task to sequence.
 * @param {function} worker
 * @param {Array} args
 * @param {function} done
 */
Sequence.prototype.add = function (worker, args, done) {
	if (!done && args && typeof(args) === 'function') {
		done = args;
		args = undefined;
	}
	if (worker && typeof(worker) === 'function') {
		var task = {worker: worker, done: done};
		if (util.isArray(args)) {
			task.args = args;
		}
		this.sequence.push(task);
	}
};

/**
 * Gets pending task in sequence.
 * @return {number} sequence lenght.
 */
Sequence.prototype.count = function () {
	return this.sequence.length;
};

module.exports = Sequence;

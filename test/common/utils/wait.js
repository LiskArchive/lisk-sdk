'use strict';

var async = require('async');
var popsicle = require('popsicle');
var http = require('../httpCommunication');
var slots = require('../../../helpers/slots');

var wait = {};

// Run callback on new round
wait.onNewRound = function (cb) {
	http.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			var nextRound = slots.calcRound(height);
			var blocksToWait = nextRound * slots.delegates - height;
			console.debug('blocks to wait: '.grey, blocksToWait);
			wait.waitForNewBlock(height, blocksToWait, cb);
		}
	});
};

// Upon detecting a new block, do something
wait.onNewBlock = function (cb) {
	http.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			wait.waitForNewBlock(height, 2, cb);
		}
	});
};

// Waits for (n) blocks to be created
wait.waitForBlocks = function (blocksToWait, cb) {
	http.getHeight(function (err, height) {
		if (err) {
			return cb(err);
		} else {
			wait.waitForNewBlock(height, blocksToWait, cb);
		}
	});
};

// Waits for a new block to be created
wait.waitForNewBlock = function (height, blocksToWait, cb) {
	if (blocksToWait === 0) {
		return setImmediate(cb, null, height);
	}

	var actualHeight = height;
	var counter = 1;
	var target = height + blocksToWait;

	async.doWhilst(
		function (cb) {
			var request = popsicle.get(http.baseUrl + '/api/node/status');

			request.use(popsicle.plugins.parse(['json']));

			request.then(function (res) {
				if (res.status !== 200) {
					return cb(['Received bad response code', res.status, res.url].join(' '));
				}

				console.log('	Waiting for block:'.grey, 'Height:'.grey, res.body.data.height, 'Target:'.grey, target, 'Second:'.grey, counter++);

				if (target === res.body.data.height) {
					height = res.body.data.height;
				}

				setTimeout(cb, 1000);
			});

			request.catch(function (err) {
				return cb(err);
			});
		},
		function () {
			return actualHeight >= height;
		},
		function (err) {
			if (err) {
				return setImmediate(cb, err);
			} else {
				return setImmediate(cb, null, height);
			}
		}
	);
};

module.exports = wait;

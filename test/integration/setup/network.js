'use strict';

var async = require('async');
var Promise = require('bluebird');
var waitUntilBlockchainReady = require('../../common/globalBefore').waitUntilBlockchainReady;
var utils = require('../utils');

module.exports = {

	waitForAllNodesToBeReady: function (configurations, cb) {
		async.forEachOf(configurations, function (configuration, index, eachCb) {
			waitUntilBlockchainReady(eachCb, 20, 2000, 'http://' + configuration.ip + ':' + configuration.httpPort);
		}, cb);
	},

	enableForgingOnDelegates: function (configurations, cb) {
		var enableForgingPromises = [];
		configurations.forEach(function (configuration) {
			configuration.forging.secret.map(function (keys) {
				var enableForgingPromise = utils.http.enableForging(keys, configuration.httpPort);
				enableForgingPromises.push(enableForgingPromise);
			});
		});
		Promise.all(enableForgingPromises).then(function (forgingResults) {
			return cb(forgingResults.some(function (forgingResult) {
				return !forgingResult.forging;
			}) ? 'Enabling forging failed for some of delegates' : null);
		}).catch(function (error) {
			return cb(error);
		});
	}
};

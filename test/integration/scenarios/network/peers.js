/*
 * Copyright © 2018 Lisk Foundation
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

var Promise = require('bluebird');
var utils = require('../../utils');

module.exports = function (params) {

	describe('Peers mutual connections', function () {

		it('should return a list of peers mutually interconnected', function () {
			return Promise.all(params.sockets.map(function (socket) {
				return socket.wampSend('list', {});
			})).then(function (results) {
				results.forEach(function (result) {
					result.should.have.property('success').to.be.true;
					result.should.have.property('peers').to.be.a('array');
					var peerPorts = result.peers.map(function (peer) {
						return peer.wsPort;
					});
					var allPorts = params.configurations.map(function (configuration) {
						return configuration.wsPort;
					});
					_.intersection(allPorts, peerPorts).should.be.an('array').and.not.to.be.empty;
				});
			});
		});
	});

	describe('forging', function () {

		function getNetworkStatus (cb) {
			Promise.all(params.sockets.map(function (socket) {
				return socket.wampSend('status');
			})).then(function (results) {
				var maxHeight = 1;
				var heightSum = 0;
				results.forEach(function (result) {
					result.should.have.property('success').to.be.true;
					result.should.have.property('height').to.be.a('number');
					if (result.height > maxHeight) {
						maxHeight = result.height;
					}
					heightSum += result.height;
				});
				return cb(null, {
					height: maxHeight,
					averageHeight: heightSum / results.length
				});

			}).catch(function (err) {
				cb(err);
			});
		}

		before(function (done) {
			// Expect some blocks to forge after 30 seconds
			var timesToCheckNetworkStatus = 30;
			var timesNetworkStatusChecked = 0;
			var checkNetworkStatusInterval = 1000;

			var checkingInterval = setInterval(function () {
				getNetworkStatus(function (err, res) {
					timesNetworkStatusChecked += 1;
					if (err) {
						clearInterval(checkingInterval);
						return done(err);
					}
					utils.logger.log('network status: height - ' + res.height + ', average height - ' + res.averageHeight);
					if (timesNetworkStatusChecked === timesToCheckNetworkStatus) {
						clearInterval(checkingInterval);
						return done(null, res);
					}
				});
			}, checkNetworkStatusInterval);
		});

		describe('network status after 30 seconds', function () {

			var getNetworkStatusError;
			var networkHeight;
			var networkAverageHeight;

			before(function (done) {
				getNetworkStatus(function (err, res) {
					getNetworkStatusError = err;
					networkHeight = res.height;
					networkAverageHeight = res.averageHeight;
					done();
				});
			});

			it('should have no error', function () {
				should.not.exist(getNetworkStatusError);
			});

			it('should have height > 1', function () {
				networkHeight.should.be.above(1);
			});

			it('should have average height above 1', function () {
				networkAverageHeight.should.be.above(1);
			});

			it('should have different peers heights propagated correctly on peers lists', function () {
				return Promise.all(params.sockets.map(function (socket) {
					return socket.wampSend('list', {});
				})).then(function (results) {
					results.some(function (peersList) {
						return peersList.peers.some(function (peer) {
							return peer.height > 1;
						});
					}).should.be.true;
				});
			});
		});
	});
};

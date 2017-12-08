'use strict';

var _ = require('lodash');
var expect = require('chai').expect;
var Promise = require('bluebird');
var utils = require('../../utils');

module.exports = function (params) {

	describe('Peers mutual connections', function () {

		it('should return a list of peers mutually interconnected', function () {
			return Promise.all(params.sockets.map(function (socket) {
				return socket.wampSend('list', {});
			})).then(function (results) {
				results.forEach(function (result) {
					expect(result).to.have.property('success').to.be.true;
					expect(result).to.have.property('peers').to.be.a('array');
					var peerPorts = result.peers.map(function (peer) {
						return peer.wsPort;
					});
					var allPorts = params.configurations.map(function (configuration) {
						return configuration.wsPort;
					});
					expect(_.intersection(allPorts, peerPorts)).to.be.an('array').and.not.to.be.empty;
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
					expect(result).to.have.property('success').to.be.true;
					expect(result).to.have.property('height').to.be.a('number');
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
				expect(getNetworkStatusError).not.to.exist;
			});

			it('should have height > 1', function () {
				expect(networkHeight).to.be.above(1);
			});

			it('should have average height above 1', function () {
				expect(networkAverageHeight).to.be.above(1);
			});

			it('should have different peers heights propagated correctly on peers lists', function () {
				return Promise.all(params.sockets.map(function (socket) {
					return socket.wampSend('list', {});
				})).then(function (results) {
					expect(results.some(function (peersList) {
						return peersList.peers.some(function (peer) {
							return peer.height > 1;
						});
					}));
				});
			});
		});
	});
};

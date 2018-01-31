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

module.exports = function(params) {
	describe('Peers mutual connections', () => {
		it('should return a list of peers mutually interconnected', () => {
			return Promise.all(
				params.sockets.map(socket => {
					return socket.wampSend('list', {});
				})
			).then(results => {
				results.forEach(result => {
					expect(result).to.have.property('success').to.be.true;
					expect(result)
						.to.have.property('peers')
						.to.be.a('array');
					var peerPorts = result.peers.map(peer => {
						return peer.wsPort;
					});
					var allPorts = params.configurations.map(configuration => {
						return configuration.wsPort;
					});
					expect(_.intersection(allPorts, peerPorts)).to.be.an('array').and.not
						.to.be.empty;
				});
			});
		});
	});

	describe('forging', () => {
		function getNetworkStatus(cb) {
			Promise.all(
				params.sockets.map(socket => {
					return socket.wampSend('status');
				})
			)
				.then(results => {
					var maxHeight = 1;
					var heightSum = 0;
					results.forEach(result => {
						expect(result).to.have.property('success').to.be.true;
						expect(result)
							.to.have.property('height')
							.to.be.a('number');
						if (result.height > maxHeight) {
							maxHeight = result.height;
						}
						heightSum += result.height;
					});
					return cb(null, {
						height: maxHeight,
						averageHeight: heightSum / results.length,
					});
				})
				.catch(err => {
					cb(err);
				});
		}

		before(done => {
			// Expect some blocks to forge after 30 seconds
			var timesToCheckNetworkStatus = 30;
			var timesNetworkStatusChecked = 0;
			var checkNetworkStatusInterval = 1000;

			var checkingInterval = setInterval(() => {
				getNetworkStatus((err, res) => {
					timesNetworkStatusChecked += 1;
					if (err) {
						clearInterval(checkingInterval);
						return done(err);
					}
					utils.logger.log(
						`network status: height - ${res.height}, average height - ${
							res.averageHeight
						}`
					);
					if (timesNetworkStatusChecked === timesToCheckNetworkStatus) {
						clearInterval(checkingInterval);
						return done(null, res);
					}
				});
			}, checkNetworkStatusInterval);
		});

		describe('network status after 30 seconds', () => {
			var getNetworkStatusError;
			var networkHeight;
			var networkAverageHeight;

			before(done => {
				getNetworkStatus((err, res) => {
					getNetworkStatusError = err;
					networkHeight = res.height;
					networkAverageHeight = res.averageHeight;
					done();
				});
			});

			it('should have no error', () => {
				expect(getNetworkStatusError).not.to.exist;
			});

			it('should have height > 1', () => {
				expect(networkHeight).to.be.above(1);
			});

			it('should have average height above 1', () => {
				expect(networkAverageHeight).to.be.above(1);
			});

			it('should have different peers heights propagated correctly on peers lists', () => {
				return Promise.all(
					params.sockets.map(socket => {
						return socket.wampSend('list', {});
					})
				).then(results => {
					expect(
						results.some(peersList => {
							return peersList.peers.some(peer => {
								return peer.height > 1;
							});
						})
					);
				});
			});
		});
	});
};

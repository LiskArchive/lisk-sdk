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

require('../functional.js');
var async = require('async');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var scClient = require('socketcluster-client');

var prefixedPeer = require('../../fixtures/peers').randomNormalizedPeer;

var Rules = require('../../../api/ws/workers/rules');

var wsServer = require('../../common/ws/server');
var WSServerMaster = require('../../common/ws/serverMaster');

describe('RPC', function () {

	var clientSocket;
	var validClientSocketOptions;
	var wampClient = new WAMPClient();
	var frozenHeaders = WSServerMaster.generatePeerHeaders({wsPort: wsServer.options.port, nonce: wsServer.validNonce});

	before(function (done) {
		validClientSocketOptions = {
			protocol: 'http',
			hostname: '127.0.0.1',
			port: __testContext.config.wsPort,
			query: _.clone(frozenHeaders)
		};
		clientSocket = scClient.connect(validClientSocketOptions);
		wampClient.upgradeToWAMP(clientSocket);
		clientSocket.on('connectAbort', done);
		clientSocket.on('connect', done.bind(null, null));
		clientSocket.on('disconnect', done);
		clientSocket.on('error', done);
	});

	describe('internal', function () {

		describe('updatePeer', function () {
			var validPeer;
			var validAcceptRequest;

			beforeEach(function () {
				validAcceptRequest = {
					authKey: 'authentication key',
					peer: prefixedPeer,
					updateType: Rules.UPDATES.INSERT
				};
				validPeer = _.clone(prefixedPeer);
			});

			describe('schema', function () {

				it('should reject empty request', function (done) {
					clientSocket.wampSend('updatePeer', undefined)
						.then(function () {
							done('should not be here');
						})
						.catch(function (err) {
							expect(err).to.equal('Expected type object but found type undefined');
							done();
						});
				});

				it('should reject requests without peer field defined', function (done) {
					delete validAcceptRequest.peer;
					clientSocket.wampSend('updatePeer', validAcceptRequest)
						.then(function () {
							done('should not be here');
						})
						.catch(function (err) {
							expect(err).to.equal('Missing required property: peer');
							done();
						});
				});

				it('should reject requests without authKey field defined', function (done) {
					delete validAcceptRequest.authKey;
					clientSocket.wampSend('updatePeer', validAcceptRequest)
						.then(function () {
							done('should not be here');
						})
						.catch(function (err) {
							expect(err).to.equal('Missing required property: authKey');
							done();
						});
				});

				it('should reject requests with incorrect authKey', function (done) {
					validAcceptRequest.authKey = 'incorrect authKey';
					clientSocket.wampSend('updatePeer', validAcceptRequest)
						.then(function () {
							done('should not be here');
						})
						.catch(function (err) {
							expect(err).to.equal('Unable to access internal function - Incorrect authKey');
							done();
						});
				});

				it('should reject requests without updateType', function (done) {
					delete validAcceptRequest.updateType;
					clientSocket.wampSend('updatePeer', validAcceptRequest)
						.then(function () {
							done('should not be here');
						})
						.catch(function (err) {
							expect(err).to.equal('Missing required property: updateType');
							done();
						});
				});

				it('should reject requests when updateType is not a number', function (done) {
					var nonNumbers = [{}, [], 'A', '1', NaN, true];
					async.forEachOf(nonNumbers, function (nonNumber, index, eachCb) {
						validAcceptRequest.updateType = nonNumber;
						clientSocket.wampSend('updatePeer', validAcceptRequest)
							.then(function () {
								eachCb('should not be here');
							})
							.catch(function (err) {
								expect(err).to.contain('Expected type integer but found type');
								eachCb();
							});
					}, done);
				});

				it('should reject requests when updateType is greater than 1', function (done) {
					validAcceptRequest.updateType = 2;
					clientSocket.wampSend('updatePeer', validAcceptRequest)
						.then(function () {
							done('should not be here');
						})
						.catch(function (err) {
							expect(err).to.contain('Value ' + validAcceptRequest.updateType + ' is greater than maximum 1');
							done();
						});
				});
			});
		});
	});

	describe('height', function () {

		it('should return height', function (done) {
			clientSocket.wampSend('height')
				.then(function (result) {
					expect(result).to.have.property('success').to.be.ok;
					expect(result).to.have.property('height').that.is.a('number').at.least(1);
					done();
				}).catch(function (err) {
					done(err);
				});
		});
	});

	describe('status', function () {

		it('should return height, broadhash, nonce, os, version and httpPort', function (done) {
			clientSocket.wampSend('status')
				.then(function (result) {
					expect(result).to.have.property('success').to.be.ok;
					expect(result).to.have.property('broadhash').that.is.a('string');
					expect(result).to.have.property('nonce').that.is.a('string');
					expect(result).to.have.property('os').that.is.a('string');
					expect(result).to.have.property('version').that.is.a('string');
					expect(result).to.have.property('httpPort').that.is.a('number');
					expect(result).to.have.property('height').that.is.a('number').at.least(1);
					done();
				}).catch(function (err) {
					done(err);
				});
		});
	});

	describe('list', function () {

		var validPeer;

		beforeEach(function () {
			validPeer = _.clone(prefixedPeer);
		});

		it('should return list of peers', function (done) {
			clientSocket.wampSend('list')
				.then(function (result) {
					expect(result).to.have.property('success').to.be.ok;
					expect(result).to.have.property('peers').to.be.an('array');
					done();
				}).catch(function (err) {
					done(err);
				});
		});

		it('asking for a list multiple times should be ok', function (done) {

			var successfulAsks = 0;
			for (var i = 0; i < 100; i += 1) {
				clientSocket.wampSend('list')
					.then(function (result) {
						expect(result).to.have.property('success').to.be.ok;
						expect(result).to.have.property('peers').to.be.an('array');
						successfulAsks += 1;
						if (successfulAsks === 100) {
							done();
						}
					}).catch(function (err) {
						done(err);
					});
			}
		});
	});

	describe('blocks', function () {

		it('should return height and broadhash', function (done) {
			clientSocket.wampSend('blocks')
				.then(function (result) {
					expect(result).to.have.property('blocks').to.be.an('array');
					done();
				}).catch(function (err) {
					done(err);
				});
		});
	});
});

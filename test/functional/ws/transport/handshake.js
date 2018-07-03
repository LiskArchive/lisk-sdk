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

require('../../functional.js');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var randomstring = require('randomstring');
var scClient = require('socketcluster-client');
var failureCodes = require('../../../../api/ws/rpc/failure_codes');
var wsServer = require('../../../common/ws/server');
var WSServerMaster = require('../../../common/ws/server_master');

describe('handshake', () => {
	var wsServerPort = 9999;
	var frozenHeaders = WSServerMaster.generatePeerHeaders();
	var validClientSocketOptions;
	var clientSocket;

	var connectAbortStub;
	var disconnectStub;
	var connectStub;
	var closeStub;
	var errorStub;

	function connect() {
		clientSocket = scClient.connect(validClientSocketOptions);
		clientSocket.on('connectAbort', () => {
			connectAbortStub();
		});
		clientSocket.on('disconnect', () => {
			disconnectStub();
		});
		clientSocket.on('error', () => {
			errorStub();
		});
		clientSocket.on('close', () => {
			closeStub();
		});
		clientSocket.on('connect', () => {
			connectStub();
		});
	}

	function disconnect() {
		if (clientSocket && clientSocket.id) {
			clientSocket.disconnect();
		}
	}

	function turnListenersOff(socket, listeners) {
		listeners.forEach(listener => socket.off(listener));
	}

	function expectNotToConnect(test, cb) {
		const closeHandler = function(...args) {
			// Prevent from calling done() multiple times
			turnListenersOff(clientSocket, ['close', 'connect']);
			clientSocket.off('close', closeHandler);
			return cb(null, ...args);
		};
		const connectHandler = () => {
			// Prevent from calling done() multiple times
			turnListenersOff(clientSocket, ['close', 'connect']);
			return cb('Socket should not connect but it did');
		};
		clientSocket.on('close', closeHandler);
		clientSocket.on('connect', connectHandler);
		test.timeout(1000);
	}

	function expectConnect(test, cb) {
		const closeHandler = function(code, description) {
			turnListenersOff(clientSocket, ['close', 'connect']);
			return cb(
				`socket should stay connected but was closed due to: ${code}: ${description}`
			);
		};
		const connectedHandler = function() {
			turnListenersOff(clientSocket, ['close', 'connect']);
			return cb(null);
		};
		clientSocket.on('connect', connectedHandler);
		clientSocket.on('close', closeHandler);
		test.timeout(1000);
	}

	beforeEach(done => {
		validClientSocketOptions = {
			protocol: 'http',
			hostname: '127.0.0.1',
			port: __testContext.config.wsPort,
			query: Object.assign({}, frozenHeaders),
			connectTimeout: 1000,
			ackTimeout: 1000,
			pingTimeout: 1000,
		};
		connectAbortStub = sinonSandbox.spy();
		disconnectStub = sinonSandbox.spy();
		closeStub = sinonSandbox.spy();
		connectStub = sinonSandbox.spy();
		errorStub = sinonSandbox.spy();
		done();
	});

	afterEach(() => {
		return disconnect();
	});

	// Define new error codes for all of the errors occuring on Server side - they can be easily passed now
	describe('with invalid headers', () => {
		describe('should fail with INVALID_HEADERS code and description', () => {
			it('without headers', function(done) {
				delete validClientSocketOptions.query;
				connect();
				expectNotToConnect(this, (err, code, description) => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property');
					done();
				});
			});

			it('with empty headers', function(done) {
				validClientSocketOptions.query = {};
				connect();
				expectNotToConnect(this, (err, code, description) => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property');
					done();
				});
			});

			it('without port', function(done) {
				delete validClientSocketOptions.query.wsPort;
				connect();
				expectNotToConnect(this, (err, code, description) => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain(
						'Expected type integer but found type not-a-number'
					);
					done();
				});
			});

			it('without height', function(done) {
				delete validClientSocketOptions.query.height;
				connect();
				expectConnect(this, done);
			});

			it('without version', function(done) {
				delete validClientSocketOptions.query.version;
				connect();
				expectNotToConnect(this, (err, code, description) => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property: version');
					done();
				});
			});

			it('without nethash', function(done) {
				delete validClientSocketOptions.query.nethash;
				connect();
				expectNotToConnect(this, (err, code, description) => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property: nethash');
					done();
				});
			});
		});
	});

	// TODO: Redesign the following tests
	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('when reaching', () => {
		describe('not reachable server', () => {
			const invalidServerIp = '1.1.1.1';
			const invalidServerPort = 1111;

			it('should close client WS connection with HANDSHAKE_ERROR', done => {
				validClientSocketOptions.hostname = invalidServerIp;
				validClientSocketOptions.port = invalidServerPort;
				connect();
				expectNotToConnect(this, (err, code) => {
					expect(code).equal(4007);
					done();
				});
			});
		});

		describe('not existing server', () => {
			const validServerIp = '127.0.0.1';
			const invalidServerPort = 1111;

			it('should close client WS connection with HANDSHAKE_ERROR', done => {
				validClientSocketOptions.hostname = validServerIp;
				validClientSocketOptions.port = invalidServerPort;
				connect();
				expectNotToConnect(this, (err, code) => {
					expect(code).equal(1006);
					done();
				});
			});
		});
	});

	describe('with valid headers', () => {
		var originalPort;

		before(() => {
			originalPort = wsServer.options.wsPort;
			wsServer.options.wsPort = wsServerPort;
			return wsServer.start();
		});

		after(done => {
			wsServer.stop();
			wsServer.options.wsPort = originalPort;
			done();
		});

		beforeEach(done => {
			/**
			 * Change of state
			 * from: not present nonce, not present connectionId, present on master
			 * to: present nonce, present connectionId, present on master
			 */
			validClientSocketOptions.query.nonce = randomstring.generate(16);
			done();
		});

		describe('when present on master', () => {
			describe('when nonce is not present', () => {
				beforeEach(done => {
					validClientSocketOptions.query.nonce = randomstring.generate(16);
					done();
				});

				it('should succeed when connectionId is present', function(done) {
					connect();
					expectConnect(this, done);
				});

				it('should succeed when connectionId is not present', function(done) {
					// Change query to obtain new id assignment during next connection
					validClientSocketOptions.query.height += 1;
					connect();
					expectConnect(this, done);
				});
			});

			describe('when nonce is present', () => {
				it('should succeed when connectionId is present', done => {
					// Impossible to recreate
					done();
				});

				it('should succeed when connectionId is not present', function(done) {
					// Change query to obtain new id assignment during next connection
					validClientSocketOptions.query.height += 1;
					connect();
					expectConnect(this, done);
				});
			});
		});

		describe('when not present on master', () => {
			var wampClient = new WAMPClient();

			beforeEach(function(done) {
				connect();
				wampClient.upgradeToWAMP(clientSocket);
				setTimeout(() => {
					validClientSocketOptions.query.state = 1;
					validClientSocketOptions.query.ip = '127.0.0.1';
					clientSocket
						.call('updateMyself', validClientSocketOptions.query)
						.then(() => {
							done();
						})
						.catch(err => {
							done(err);
						});
				}, 1000);
				this.timeout(2000);
			});

			afterEach(() => {
				return disconnect();
			});

			describe('when nonce is not present', () => {
				beforeEach(() => {
					validClientSocketOptions.query.nonce = randomstring.generate(16);
					return disconnect();
				});

				it('should succeed when connectionId is present', function(done) {
					connect();
					expectConnect(this, done);
				});

				it('should succeed when connectionId is not present', function(done) {
					validClientSocketOptions.query.height += 1;
					connect();
					expectConnect(this, done);
				});
			});

			describe('when nonce is present', () => {
				beforeEach(() => {
					return disconnect();
				});

				it('should succeed when connectionId is present', function(done) {
					connect();
					expectConnect(this, done);
				});

				it('should succeed when connectionId is not present', function(done) {
					// Change query to obtain new id assignment during next connection
					validClientSocketOptions.query.height += 1;
					connect();
					expectConnect(this, done);
				});
			});
		});
	});
});

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

var testConfig = require('../../../data/config.json');

var failureCodes = require('../../../../api/ws/rpc/failure_codes');

var ws = require('../../../common/ws/communication'); // eslint-disable-line no-unused-vars
var wsServer = require('../../../common/ws/server');
var WSServerMaster = require('../../../common/ws/server_master');

describe('handshake', () => {
	var wsServerPort = 9999;
	var frozenHeaders = WSServerMaster.generatePeerHeaders({
		wsPort: wsServerPort,
		nonce: wsServer.validNonce,
	});
	var validClientSocketOptions;
	var clientSocket;
	var currentConnectedSocket;

	var connectAbortStub;
	var disconnectStub;
	var errorStub;

	function connect() {
		clientSocket = scClient.connect(validClientSocketOptions);
		clientSocket.on('connectAbort', connectAbortStub);
		clientSocket.on('disconnect', disconnectStub);
		clientSocket.on('error', errorStub);
	}

	function disconnect() {
		if (clientSocket && clientSocket.id) {
			clientSocket.disconnect();
		}
	}

	function expectDisconnect(test, cb) {
		var disconnectHandler = function(code, description) {
			// Prevent from calling done() multiple times
			clientSocket.off('disconnect', disconnectHandler);
			return cb(code, description);
		};
		clientSocket.on('disconnect', disconnectHandler);
		test.timeout(1000);
	}

	function expectConnect(test, cb) {
		var disconnectHandler = function(code, description) {
			currentConnectedSocket = null;
			clientSocket.off('disconnect', disconnectHandler);
			expect(
				`socket had been disconnected with error code: ${code} - ${description ||
					failureCodes.errorMessages[code]}`
			).equal('socket should stay connected');
			return cb(code);
		};
		var acceptedHandler = function() {
			clientSocket.off('accepted', acceptedHandler);
			clientSocket.off('disconnect', disconnectHandler);
			return cb(null, currentConnectedSocket);
		};
		var connectedHandler = function(socket) {
			currentConnectedSocket = socket;
			clientSocket.off('connect', connectedHandler);
		};
		clientSocket.on('accepted', acceptedHandler);
		clientSocket.on('connect', connectedHandler);
		clientSocket.on('disconnect', disconnectHandler);
		test.timeout(1000);
	}

	beforeEach(() => {
		validClientSocketOptions = {
			protocol: 'http',
			hostname: '127.0.0.1',
			port: testConfig.wsPort,
			query: _.clone(frozenHeaders),
		};
		connectAbortStub = sinonSandbox.spy();
		disconnectStub = sinonSandbox.spy();
		errorStub = sinonSandbox.spy();
	});

	afterEach(() => {
		disconnect();
	});

	describe('with invalid headers', () => {
		describe('should fail with INVALID_HEADERS code and description', () => {
			it('without headers', function(done) {
				delete validClientSocketOptions.query;
				connect();
				expectDisconnect(this, code => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					done();
				});
			});

			it('with empty headers', function(done) {
				validClientSocketOptions.query = {};
				connect();
				expectDisconnect(this, (code, description) => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property');
					done();
				});
			});

			it('without port', function(done) {
				delete validClientSocketOptions.query.wsPort;
				connect();
				expectDisconnect(this, (code, description) => {
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
				expectDisconnect(this, (code, description) => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain(
						'height: Expected type integer but found type not-a-number'
					);
					done();
				});
			});

			it('without version', function(done) {
				delete validClientSocketOptions.query.version;
				connect();
				expectDisconnect(this, (code, description) => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property: version');
					done();
				});
			});

			it('without nethash', function(done) {
				delete validClientSocketOptions.query.nethash;
				connect();
				expectDisconnect(this, (code, description) => {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property: nethash');
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
			wsServer.start();
		});

		after(() => {
			wsServer.stop();
			wsServer.options.wsPort = originalPort;
		});

		beforeEach(() => {
			/**
			 * Change of state
			 * from: not present nonce, not present connectionId, present on master
			 * to: present nonce, present connectionId, present on master
			 */
			validClientSocketOptions.query.nonce = randomstring.generate(16);
		});

		describe('when present on master', () => {
			describe('when nonce is not present', () => {
				beforeEach(() => {
					validClientSocketOptions.query.nonce = randomstring.generate(16);
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
				it('should succeed when connectionId is present', () => {
					// Impossible to recreate
				});

				it('should succeed when connectionId is not present', function(done) {
					// Change query to obtain new id assignment during next connection
					validClientSocketOptions.query.height += 1;
					connect();
					expectConnect(this, done);
				});
			});
		});

		describe('when not present on master @unstable', () => {
			var wampClient = new WAMPClient();

			beforeEach(function(done) {
				connect();
				wampClient.upgradeToWAMP(clientSocket);
				setTimeout(() => {
					validClientSocketOptions.query.state = 1;
					clientSocket
						.wampSend('updateMyself', validClientSocketOptions.query)
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
				disconnect();
			});

			describe('when nonce is not present', () => {
				beforeEach(() => {
					validClientSocketOptions.query.nonce = randomstring.generate(16);
					disconnect();
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
					disconnect();
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

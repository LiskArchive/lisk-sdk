'use strict';

var _ = require('lodash');
var expect = require('chai').expect;
var sinon = require('sinon');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var failureCodes = require('../../../api/ws/rpc/failureCodes');
var node = require('../../node');
var randomString = require('randomstring');
var scClient = require('socketcluster-client');
var testConfig = require('../../config.json');
var ws = require('../../common/wsCommunication');
var wsServer = require('../../common/wsServer');

describe('handshake', function () {

	var frozenHeaders = node.generatePeerHeaders('127.0.0.1', wsServer.port, wsServer.validNonce);
	var validClientSocketOptions;
	var clientSocket;
	var currentConnectedSocket;

	var connectStub;
	var connectAbortStub;
	var disconnectStub;
	var errorStub;

	function connect () {
		clientSocket = scClient.connect(validClientSocketOptions);
		clientSocket.on('connectAbort', connectAbortStub);
		clientSocket.on('connect', connectStub);
		clientSocket.on('disconnect', disconnectStub);
		clientSocket.on('error', errorStub);
	}

	function expectDisconnect (testContext, cb) {
		var disconnectHandler = function (code, description) {
			// Prevent from calling done() multiple times
			clientSocket.off('disconnect', disconnectHandler);
			return cb(code, description);
		};
		clientSocket.on('disconnect', disconnectHandler);
		testContext.timeout(1000);
	}

	function expectConnect (testContext, cb) {
		var connectHandler = function (socket) {
			// Prevent from calling done() multiple times
			currentConnectedSocket = socket;
			clientSocket.off('connect', connectHandler);
			setTimeout(function () {
				if (disconnectStub.called) {
					var errCode = disconnectStub.args[0][0];
					expect('socket had been disconnected with error code: ' + errCode + ' - ' + failureCodes.errorMessages[errCode]).equal('socket should stay connected');
				}
				expect(disconnectStub.notCalled).to.be.true;
				return cb(null, socket);
			}, 500);
		};
		clientSocket.on('connect', connectHandler);
		testContext.timeout(1000);
	}

	beforeEach(function () {
		validClientSocketOptions = {
			protocol: 'http',
			hostname: '127.0.0.1',
			port: testConfig.port,
			query: _.clone(frozenHeaders)
		};
		connectStub = sinon.spy();
		connectAbortStub = sinon.spy();
		disconnectStub = sinon.spy();
		errorStub = sinon.spy();
	});

	afterEach(function () {
		if (clientSocket) {
			clientSocket.disconnect();
		}
	});

	describe('with invalid headers', function () {

		describe('failing with INVALID_HEADERS code', function () {

			it('should fail without headers', function (done) {
				delete validClientSocketOptions.query;
				connect();
				expectDisconnect(this, function (code) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					done();
				});
			});

			it('should fail with null headers', function (done) {
				validClientSocketOptions.query = null;
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property');
					done();
				});
			});

			it('should fail with undefined headers', function (done) {
				validClientSocketOptions.query = undefined;
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property');
					done();
				});
			});

			it('should fail with empty headers', function (done) {
				validClientSocketOptions.query = {};
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property');
					done();
				});
			});
		});

		describe('failing with INVALID_HEADERS code and description', function () {

			it('should fail with without port', function (done) {
				delete validClientSocketOptions.query.port;
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Expected type integer but found type not-a-number');
					done();
				});
			});

			it('should fail without height', function (done) {
				delete validClientSocketOptions.query.height;
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('#/height: Expected type integer but found type not-a-number');
					done();
				});
			});

			it('should fail without version', function (done) {
				delete validClientSocketOptions.query.version;
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property: version');
					done();
				});
			});

			it('should fail without nethash', function (done) {
				delete validClientSocketOptions.query.nethash;
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property: nethash');
					done();
				});
			});
		});
	});

	describe('with valid headers', function () {

		before(function () {
			wsServer.start();
		});

		after(function () {
			wsServer.stop();
		});

		beforeEach(function () {
			/**
			 * Change of state
			 * from: not present nonce, not present connectionId, present on master
			 * to: present nonce, present connectionId, present on master
			 */
			validClientSocketOptions.query.nonce = randomString.generate(16);
			connect();
		});

		describe('when present on master', function () {

			describe('when nonce is not present', function () {

				beforeEach(function () {
					validClientSocketOptions.query.nonce = randomString.generate(16);
				});

				it('should succeed when connectionId is present', function (done) {
					connect();
					expectConnect(this, done);
				});

				it('should succeed when connectionId is not present', function (done) {
					// Change query to obtain new id assignment during next connection
					validClientSocketOptions.query.height += 1;
					connect();
					expectConnect(this, done);
				});
			});

			describe('when nonce is present', function () {

				it('should succeed when connectionId is present', function () {
					// Impossible to recreate
				});

				it('should succeed when connectionId is not present', function (done) {
					// Change query to obtain new id assignment during next connection
					validClientSocketOptions.query.height += 1;
					connect();
					expectConnect(this, done);
				});
			});
		});

		describe('when not present on master', function () {

			var wampClient = new WAMPClient();

			beforeEach(function (done) {
				wampClient.upgradeToWAMP(clientSocket);
				setTimeout(function () {
					validClientSocketOptions.query.state = 1;
					clientSocket.wampSend('updateMyself', validClientSocketOptions.query)
						.then(function () {
							done();
						})
						.catch(function (err) {
							done(err);
						});
				}, 1000);
				this.timeout(2000);
			});

			describe('when nonce is not present', function () {

				beforeEach(function () {
					validClientSocketOptions.query.nonce = randomString.generate(16);
				});

				it('should succeed when connectionId is present', function (done) {
					connect();
					expectConnect(this, done);
				});

				it('should succeed when connectionId is not present', function (done) {
					validClientSocketOptions.query.height += 1;
					connect();
					expectConnect(this, done);
				});
			});

			describe('when nonce is not present', function () {

				it('should succeed when connectionId is present', function (done) {
					connect();
					expectConnect(this, done);
				});

				it('should succeed when connectionId is not present', function (done) {
					// Change query to obtain new id assignment during next connection
					validClientSocketOptions.query.height += 1;
					connect();
					expectConnect(this, done);
				});
			});
		});
	});
});

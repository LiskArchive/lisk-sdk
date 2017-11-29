'use strict';

require('../functional.js');

var _ = require('lodash');
var expect = require('chai').expect;
var sinon = require('sinon');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var failureCodes = require('../../../api/ws/rpc/failureCodes');
var node = require('../../node');
var randomString = require('randomstring');
var scClient = require('socketcluster-client');
var testConfig = require('../../data/config.json');
var ws = require('../../common/ws/communication');
var wsServer = require('../../common/ws/server');
var WSClient = require('../../common/ws/client');

describe('handshake', function () {

	var wsServerPort = 9999;
	var frozenHeaders = WSClient.generatePeerHeaders('127.0.0.1', wsServerPort, wsServer.validNonce);
	var validClientSocketOptions;
	var clientSocket;
	var currentConnectedSocket;

	var connectAbortStub;
	var disconnectStub;
	var errorStub;

	function connect () {
		clientSocket = scClient.connect(validClientSocketOptions);
		clientSocket.on('connectAbort', connectAbortStub);
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
		var disconnectHandler = function (code, description) {
			currentConnectedSocket = null;
			clientSocket.off('disconnect', disconnectHandler);
			expect('socket had been disconnected with error code: ' + code + ' - ' + (description || failureCodes.errorMessages[code]))
				.equal('socket should stay connected');
			return cb(code);
		};
		var acceptedHandler = function () {
			clientSocket.off('accepted', acceptedHandler);
			clientSocket.off('disconnect', disconnectHandler);
			return cb(null, currentConnectedSocket);
		};
		var connectedHandler = function (socket) {
			currentConnectedSocket = socket;
			clientSocket.off('connect', connectedHandler);
		};
		clientSocket.on('accepted', acceptedHandler);
		clientSocket.on('connect', connectedHandler);
		clientSocket.on('disconnect', disconnectHandler);
		testContext.timeout(1000);
	}

	beforeEach(function () {
		validClientSocketOptions = {
			protocol: 'http',
			hostname: '127.0.0.1',
			port: testConfig.port,
			query: _.clone(frozenHeaders)
		};
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

		describe('should fail with INVALID_HEADERS code and description', function () {

			it('without headers', function (done) {
				delete validClientSocketOptions.query;
				connect();
				expectDisconnect(this, function (code) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					done();
				});
			});

			it('with empty headers', function (done) {
				validClientSocketOptions.query = {};
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property');
					done();
				});
			});

			it('without port', function (done) {
				delete validClientSocketOptions.query.port;
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Expected type integer but found type not-a-number');
					done();
				});
			});

			it('without height', function (done) {
				delete validClientSocketOptions.query.height;
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('#/height: Expected type integer but found type not-a-number');
					done();
				});
			});

			it('without version', function (done) {
				delete validClientSocketOptions.query.version;
				connect();
				expectDisconnect(this, function (code, description) {
					expect(code).equal(failureCodes.INVALID_HEADERS);
					expect(description).contain('Missing required property: version');
					done();
				});
			});

			it('without nethash', function (done) {
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

		var originalPort;

		before(function () {
			originalPort = wsServer.options.port;
			wsServer.options.port = wsServerPort;
			wsServer.start();
		});

		after(function () {
			wsServer.stop();
			wsServer.options.port = originalPort;
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

			describe('when nonce is present', function () {

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

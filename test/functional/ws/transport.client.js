'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var randomstring = require('randomstring');
var sinon = require('sinon');
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

var config = require('../../data/config.json');
var failureCodes = require('../../../api/ws/rpc/failureCodes');
var wsRPC = require('../../../api/ws/rpc/wsRPC').wsRPC;
var transport = require('../../../api/ws/transport');
var System = require('../../../modules/system');
var node = require('../../node');
var WSClient = require('../../common/ws/client');

describe('ClientRPCStub', function () {

	var validWSServerIp = '127.0.0.1';
	var validWSServerPort = 5000;
	var validClientRPCStub;
	var socketClusterMock;

	before(function () {
		socketClusterMock = {
			on: sinon.spy()
		};
		wsRPC.setServer(new MasterWAMPServer(socketClusterMock));
		// Register RPC
		var transportModuleMock = {internal: {}, shared: {}};
		transport(transportModuleMock);
		// Now ClientRPCStub should contain all methods names
		validClientRPCStub = wsRPC.getClientRPCStub(validWSServerIp, validWSServerPort);
	});

	describe('should contain remote procedure', function () {

		it('updatePeer', function () {
			expect(validClientRPCStub).to.have.property('updatePeer');
		});

		it('blocksCommon', function () {
			expect(validClientRPCStub).to.have.property('blocksCommon');
		});

		it('height', function () {
			expect(validClientRPCStub).to.have.property('height');
		});

		it('getTransactions', function () {
			expect(validClientRPCStub).to.have.property('getTransactions');
		});

		it('getSignatures', function () {
			expect(validClientRPCStub).to.have.property('getSignatures');
		});

		it('status', function () {
			expect(validClientRPCStub).to.have.property('list');
		});

		it('postBlock', function () {
			expect(validClientRPCStub).to.have.property('postBlock');
		});

		it('postSignatures', function () {
			expect(validClientRPCStub).to.have.property('postSignatures');
		});

		it('postTransactions', function () {
			expect(validClientRPCStub).to.have.property('postTransactions');
		});
	});

	it('should not contain randomProcedure', function () {
		expect(validClientRPCStub).not.to.have.property('randomProcedure');
	});

	describe('RPC call', function () {

		var minVersion = '0.0.0';
		var validHeaders;

		beforeEach(function () {
			validHeaders = WSClient.generatePeerHeaders();
			System.setHeaders(validHeaders);
		});

		describe('with valid headers', function () {

			it('should call a RPC callback with response', function (done) {
				validClientRPCStub.status(function (err, response) {
					expect(response).not.to.be.empty;
					done();
				});
			});

			it('should call a RPC callback without an error as null', function (done) {
				validClientRPCStub.status(function (err) {
					expect(err).to.be.null;
					done();
				});
			});
		});

		describe('with invalid headers', function () {

			beforeEach(function () {
				wsRPC.clientsConnectionsMap = {};
				validClientRPCStub = wsRPC.getClientRPCStub(validWSServerIp, validWSServerPort);
			});

			it('without port should call RPC callback with INVALID_HEADERS error', function (done) {
				delete validHeaders.port;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(function (err) {
					expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
					expect(err).to.have.property('description').equal('#/port: Expected type integer but found type not-a-number');
					done();
				});
			});

			it('with valid port as string should call RPC callback without an error', function (done) {
				validHeaders.port = validHeaders.port.toString();
				System.setHeaders(validHeaders);
				validClientRPCStub.status(function (err) {
					expect(err).to.be.null;
					done();
				});
			});

			it('with too short nonce should call RPC callback with INVALID_HEADERS error', function (done) {
				validHeaders.nonce = 'TOO_SHORT';
				System.setHeaders(validHeaders);
				validClientRPCStub.status(function (err) {
					expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
					expect(err).to.have.property('description').equal('#/nonce: String is too short (9 chars), minimum 16');
					done();
				});
			});

			it('with too long nonce should call RPC callback with INVALID_HEADERS error', function (done) {
				validHeaders.nonce = 'NONCE_LONGER_THAN_16_CHARS';
				System.setHeaders(validHeaders);
				validClientRPCStub.status(function (err) {
					expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
					expect(err).to.have.property('description').equal('#/nonce: String is too long (26 chars), maximum 16');
					done();
				});
			});

			it('without nonce should call RPC callback with INVALID_HEADERS error', function (done) {
				delete validHeaders.nonce;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(function (err) {
					expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
					expect(err).to.have.property('description').equal('#/: Missing required property: nonce');
					done();
				});
			});

			it('without nethash should call RPC callback with INVALID_HEADERS error', function (done) {
				delete validHeaders.nethash;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(function (err) {
					expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
					expect(err).to.have.property('description').equal('#/: Missing required property: nethash');
					done();
				});
			});

			it('without height should call RPC callback with INVALID_HEADERS error', function (done) {
				delete validHeaders.height;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(function (err) {
					expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
					expect(err).to.have.property('description').equal('#/height: Expected type integer but found type not-a-number');
					done();
				});
			});

			it('without version should call RPC callback with INVALID_HEADERS error', function (done) {
				delete validHeaders.version;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(function (err) {
					expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
					expect(err).to.have.property('description').equal('#/: Missing required property: version');
					done();
				});
			});
		});
	});

	describe('when reaching', function () {

		describe('not reachable server', function () {

			before(function () {
				var invalisServerIp = '1.1.1.1';
				var invalisServerPort = 1111;
				validClientRPCStub = wsRPC.getClientRPCStub(invalisServerIp, invalisServerPort);
			});

			it('should call RPC callback with CONNECTION_TIMEOUT error', function (done) {
				validClientRPCStub.status(function (err) {
					expect(err).to.have.property('code').equal(failureCodes.CONNECTION_TIMEOUT);
					expect(err).to.have.property('message').equal(failureCodes.errorMessages[failureCodes.CONNECTION_TIMEOUT]);
					done();
				});
			});
		});

		describe('not existing server', function () {

			before(function () {
				var validServerIp = '127.0.0.1';
				var invalisServerPort = 1111;
				validClientRPCStub = wsRPC.getClientRPCStub(validServerIp, invalisServerPort);
			});

			it('should call RPC callback with HANDSHAKE_ERROR error', function (done) {
				validClientRPCStub.status(function (err) {
					expect(err).to.have.property('code').equal(failureCodes.HANDSHAKE_ERROR);
					expect(err).to.have.property('message').equal(failureCodes.errorMessages[failureCodes.HANDSHAKE_ERROR]);
					done();
				});
			});
		});
	});
});

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
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

var failureCodes = require('../../../../api/ws/rpc/failure_codes');
var wsRPC = require('../../../../api/ws/rpc/ws_rpc').wsRPC;
var transport = require('../../../../api/ws/transport');
var System = require('../../../../modules/system');

var WSServer = require('../../../common/ws/server_master');

describe('ClientRPCStub', () => {
	var validWSServerIp = '127.0.0.1';
	var validWSServerPort = 5000;
	var validClientRPCStub;
	var socketClusterMock;

	before(() => {
		socketClusterMock = {
			on: sinonSandbox.spy(),
		};
		wsRPC.setServer(new MasterWAMPServer(socketClusterMock));
		// Register RPC
		var transportModuleMock = { internal: {}, shared: {} };
		transport(transportModuleMock);
		// Now ClientRPCStub should contain all methods names
		validClientRPCStub = wsRPC.getClientRPCStub(
			validWSServerIp,
			validWSServerPort
		);
	});

	describe('should contain remote procedure', () => {
		it('updatePeer', () => {
			expect(validClientRPCStub).to.have.property('updatePeer');
		});

		it('blocksCommon', () => {
			expect(validClientRPCStub).to.have.property('blocksCommon');
		});

		it('height', () => {
			expect(validClientRPCStub).to.have.property('height');
		});

		it('getTransactions', () => {
			expect(validClientRPCStub).to.have.property('getTransactions');
		});

		it('getSignatures', () => {
			expect(validClientRPCStub).to.have.property('getSignatures');
		});

		it('status', () => {
			expect(validClientRPCStub).to.have.property('list');
		});

		it('postBlock', () => {
			expect(validClientRPCStub).to.have.property('postBlock');
		});

		it('postSignatures', () => {
			expect(validClientRPCStub).to.have.property('postSignatures');
		});

		it('postTransactions', () => {
			expect(validClientRPCStub).to.have.property('postTransactions');
		});
	});

	it('should not contain randomProcedure', () => {
		expect(validClientRPCStub).not.to.have.property('randomProcedure');
	});

	describe('RPC call', () => {
		var validHeaders;

		beforeEach(() => {
			validHeaders = WSServer.generatePeerHeaders();
			System.setHeaders(validHeaders);
		});

		describe('with valid headers', () => {
			it('should call a RPC callback with response', done => {
				validClientRPCStub.status((err, response) => {
					expect(response).not.to.be.empty;
					done();
				});
			});

			it('should call a RPC callback without an error as null', done => {
				validClientRPCStub.status(err => {
					expect(err).to.be.null;
					done();
				});
			});
		});

		describe('with invalid headers', () => {
			beforeEach(() => {
				wsRPC.clientsConnectionsMap = {};
				validClientRPCStub = wsRPC.getClientRPCStub(
					validWSServerIp,
					validWSServerPort
				);
			});

			it('without port should call RPC callback with INVALID_HEADERS error', done => {
				delete validHeaders.wsPort;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.INVALID_HEADERS);
					expect(err)
						.to.have.property('description')
						.equal('wsPort: Expected type integer but found type not-a-number');
					done();
				});
			});

			it('with valid port as string should call RPC callback without an error', done => {
				validHeaders.wsPort = validHeaders.wsPort.toString();
				System.setHeaders(validHeaders);
				validClientRPCStub.status(err => {
					expect(err).to.be.null;
					done();
				});
			});

			it('with too short nonce should call RPC callback with INVALID_HEADERS error', done => {
				validHeaders.nonce = 'TOO_SHORT';
				System.setHeaders(validHeaders);
				validClientRPCStub.status(err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.INVALID_HEADERS);
					expect(err)
						.to.have.property('description')
						.equal('nonce: String is too short (9 chars), minimum 16');
					done();
				});
			});

			it('with too long nonce should call RPC callback with INVALID_HEADERS error', done => {
				validHeaders.nonce = 'NONCE_LONGER_THAN_16_CHARS';
				System.setHeaders(validHeaders);
				validClientRPCStub.status(err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.INVALID_HEADERS);
					expect(err)
						.to.have.property('description')
						.equal('nonce: String is too long (26 chars), maximum 16');
					done();
				});
			});

			it('without nonce should call RPC callback with INVALID_HEADERS error', done => {
				delete validHeaders.nonce;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.INVALID_HEADERS);
					expect(err)
						.to.have.property('description')
						.equal(': Missing required property: nonce');
					done();
				});
			});

			it('without nethash should call RPC callback with INVALID_HEADERS error', done => {
				delete validHeaders.nethash;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.INVALID_HEADERS);
					expect(err)
						.to.have.property('description')
						.equal(': Missing required property: nethash');
					done();
				});
			});

			it('without height should call RPC callback with INVALID_HEADERS error', done => {
				delete validHeaders.height;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.INVALID_HEADERS);
					expect(err)
						.to.have.property('description')
						.equal('height: Expected type integer but found type not-a-number');
					done();
				});
			});

			it('without version should call RPC callback with INVALID_HEADERS error', done => {
				delete validHeaders.version;
				System.setHeaders(validHeaders);
				validClientRPCStub.status(err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.INVALID_HEADERS);
					expect(err)
						.to.have.property('description')
						.equal(': Missing required property: version');
					done();
				});
			});
		});
	});

	describe('when reaching', () => {
		describe('not reachable server', () => {
			before(() => {
				var invalisServerIp = '1.1.1.1';
				var invalisServerPort = 1111;
				validClientRPCStub = wsRPC.getClientRPCStub(
					invalisServerIp,
					invalisServerPort
				);
			});

			it('should call RPC callback with CONNECTION_TIMEOUT error', done => {
				validClientRPCStub.status(err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.CONNECTION_TIMEOUT);
					expect(err)
						.to.have.property('message')
						.equal(failureCodes.errorMessages[failureCodes.CONNECTION_TIMEOUT]);
					done();
				});
			});
		});

		describe('not existing server', () => {
			before(() => {
				var validServerIp = '127.0.0.1';
				var invalisServerPort = 1111;
				validClientRPCStub = wsRPC.getClientRPCStub(
					validServerIp,
					invalisServerPort
				);
			});

			it('should call RPC callback with HANDSHAKE_ERROR error', done => {
				validClientRPCStub.status(err => {
					expect(err)
						.to.have.property('code')
						.equal(failureCodes.HANDSHAKE_ERROR);
					expect(err)
						.to.have.property('message')
						.equal(failureCodes.errorMessages[failureCodes.HANDSHAKE_ERROR]);
					done();
				});
			});
		});
	});
});

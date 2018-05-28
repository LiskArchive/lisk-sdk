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
const MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
const connect = require('../../../../api/ws/rpc/connect');
const wsRPC = require('../../../../api/ws/rpc/ws_rpc').wsRPC;
const transport = require('../../../../api/ws/transport');
const System = require('../../../../modules/system');
const WSServer = require('../../../common/ws/server_master');

describe('RPC Client', () => {
	const validWSServerIp = '127.0.0.1';
	const validWSServerPort = 5000;
	let validClientRPCStub;
	let socketClusterMock;

	function reconnect(ip = validWSServerIp, wsPort = validWSServerPort) {
		const loggerMock = {
			error: sinonSandbox.stub(),
			warn: sinonSandbox.stub(),
			log: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
			trace: sinonSandbox.stub(),
		};
		validClientRPCStub = connect({ ip, wsPort }, loggerMock).rpc;
	}

	before(done => {
		socketClusterMock = {
			on: sinonSandbox.spy(),
		};
		wsRPC.setServer(new MasterWAMPServer(socketClusterMock));
		// Register RPC
		const transportModuleMock = { internal: {}, shared: {} };
		transport(transportModuleMock);
		// Now ClientRPCStub should contain all methods names
		reconnect();
		done();
	});

	describe('should contain remote procedure', () => {
		it('updatePeer', () => {
			return expect(validClientRPCStub).to.have.property('updatePeer');
		});

		it('blocksCommon', () => {
			return expect(validClientRPCStub).to.have.property('blocksCommon');
		});

		it('height', () => {
			return expect(validClientRPCStub).to.have.property('height');
		});

		it('getTransactions', () => {
			return expect(validClientRPCStub).to.have.property('getTransactions');
		});

		it('getSignatures', () => {
			return expect(validClientRPCStub).to.have.property('getSignatures');
		});

		it('status', () => {
			return expect(validClientRPCStub).to.have.property('list');
		});

		it('postBlock', () => {
			return expect(validClientRPCStub).to.have.property('postBlock');
		});

		it('postSignatures', () => {
			return expect(validClientRPCStub).to.have.property('postSignatures');
		});

		it('postTransactions', () => {
			return expect(validClientRPCStub).to.have.property('postTransactions');
		});
	});

	it('should not contain randomProcedure', () => {
		return expect(validClientRPCStub).not.to.have.property('randomProcedure');
	});

	describe('RPC call', () => {
		let validHeaders;

		beforeEach(done => {
			validHeaders = WSServer.generatePeerHeaders();
			System.setHeaders(validHeaders);
			reconnect();
			done();
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
			describe('without port', () => {
				beforeEach(done => {
					delete validHeaders.wsPort;
					System.setHeaders(validHeaders);
					reconnect();
					done();
				});

				it('should call rpc.status with err = "BadConnectionError: Event \'rpc-request\' was aborted due to a bad connection"', done => {
					validClientRPCStub.status(err => {
						expect(err).equal(
							"BadConnectionError: Event 'rpc-request' was aborted due to a bad connection"
						);
						done();
					});
				});
			});

			// TODO: Throws "Unable to find resolving function for procedure status with signature ..." error
			describe('with valid port as string', () => {
				beforeEach(done => {
					validHeaders.wsPort = validHeaders.wsPort.toString();
					System.setHeaders(validHeaders);
					reconnect();
					done();
				});

				it('should call rpc.status with err = null', done => {
					validClientRPCStub.status(err => {
						expect(err).to.be.null;
						done();
					});
				});
			});

			describe('with too short nonce', () => {
				beforeEach(done => {
					validHeaders.nonce = 'TOO_SHORT';
					System.setHeaders(validHeaders);
					reconnect();
					done();
				});

				it('should call rpc.status with err = "BadConnectionError: Event \'rpc-request\' was aborted due to a bad connection"', done => {
					validClientRPCStub.status(err => {
						expect(err).equal(
							"BadConnectionError: Event 'rpc-request' was aborted due to a bad connection"
						);
						done();
					});
				});
			});

			describe('with too long nonce', () => {
				beforeEach(done => {
					validHeaders.nonce = 'NONCE_LONGER_THAN_16_CHARS';
					System.setHeaders(validHeaders);
					reconnect();
					done();
				});

				it('should call rpc.status with err = "BadConnectionError: Event \'rpc-request\' was aborted due to a bad connection"', done => {
					validClientRPCStub.status(err => {
						expect(err).equal(
							"BadConnectionError: Event 'rpc-request' was aborted due to a bad connection"
						);
						done();
					});
				});
			});

			describe('without nonce', () => {
				beforeEach(done => {
					delete validHeaders.nonce;
					System.setHeaders(validHeaders);
					reconnect();
					done();
				});

				it('should call rpc.status with err = "BadConnectionError: Event \'rpc-request\' was aborted due to a bad connection"', done => {
					validClientRPCStub.status(err => {
						expect(err).equal(
							"BadConnectionError: Event 'rpc-request' was aborted due to a bad connection"
						);
						done();
					});
				});
			});

			describe('without nethash', () => {
				beforeEach(done => {
					delete validHeaders.nethash;
					System.setHeaders(validHeaders);
					reconnect();
					done();
				});

				it('should call rpc.status with err = "BadConnectionError: Event \'rpc-request\' was aborted due to a bad connection"', done => {
					validClientRPCStub.status(err => {
						expect(err).equal(
							"BadConnectionError: Event 'rpc-request' was aborted due to a bad connection"
						);
						done();
					});
				});
			});

			describe('without height', () => {
				beforeEach(done => {
					delete validHeaders.height;
					System.setHeaders(validHeaders);
					reconnect();
					done();
				});

				it('should call rpc.status with err = null', done => {
					validClientRPCStub.status(err => {
						expect(err).to.be.null;
						done();
					});
				});
			});

			describe('without version', () => {
				beforeEach(done => {
					delete validHeaders.version;
					System.setHeaders(validHeaders);
					reconnect();
					done();
				});

				it('should call rpc.status with err = "BadConnectionError: Event \'rpc-request\' was aborted due to a bad connection"', done => {
					validClientRPCStub.status(err => {
						expect(err).equal(
							"BadConnectionError: Event 'rpc-request' was aborted due to a bad connection"
						);
						done();
					});
				});
			});
		});
	});
});

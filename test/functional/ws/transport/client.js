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
	let validPeerStub;
	let validClientRPCStub;
	let socketClusterMock;
	let closeErrorCode;
	let closeErrorReason;

	function createLoggerMock() {
		const loggerMock = {
			error: sinonSandbox.stub(),
			warn: sinonSandbox.stub(),
			log: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
			trace: sinonSandbox.stub(),
		};
		return loggerMock;
	}

	function reconnect(ip = validWSServerIp, wsPort = validWSServerPort) {
		if (
			validPeerStub &&
			validPeerStub.socket &&
			validPeerStub.socket.state == validPeerStub.socket.OPEN
		) {
			validPeerStub.socket.disconnect();
		}
		const loggerMock = createLoggerMock();
		validPeerStub = connect({ ip, wsPort }, loggerMock);
		validClientRPCStub = validPeerStub.rpc;
	}

	function captureConnectionResult(callback) {
		closeErrorCode = null;
		closeErrorReason = null;
		validPeerStub.socket.removeAllListeners('close');
		validPeerStub.socket.removeAllListeners('connect');

		validPeerStub.socket.on('close', (code, reason) => {
			closeErrorCode = code;
			closeErrorReason = reason;
			callback && callback(code, reason);
		});

		if (callback) {
			validPeerStub.socket.on('connect', () => {
				callback();
			});
		}
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
					captureConnectionResult();
					done();
				});

				it('should close connection with code = 4100 and reason = "wsPort: Expected type integer but found type not-a-number"', done => {
					validClientRPCStub.status(() => {
						expect(closeErrorCode).equal(4100);
						expect(closeErrorReason).equal(
							'wsPort: Expected type integer but found type not-a-number'
						);
						done();
					});
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
					captureConnectionResult();
					done();
				});

				it('should close connection with code = 4100 and reason = "nonce: String is too short (9 chars), minimum 16"', done => {
					validClientRPCStub.status(() => {
						expect(closeErrorCode).equal(4100);
						expect(closeErrorReason).equal(
							'nonce: String is too short (9 chars), minimum 16'
						);
						done();
					});
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
					captureConnectionResult();
					done();
				});

				it('should close connection with code = 4100 and reason = "nonce: String is too long (26 chars), maximum 16"', done => {
					validClientRPCStub.status(() => {
						expect(closeErrorCode).equal(4100);
						expect(closeErrorReason).equal(
							'nonce: String is too long (26 chars), maximum 16'
						);
						done();
					});
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
					captureConnectionResult();
					done();
				});

				it('should close connection with code = 4100 and reason = "Missing required property: nonce"', done => {
					validClientRPCStub.status(() => {
						expect(closeErrorCode).equal(4100);
						expect(closeErrorReason).equal('Missing required property: nonce');
						done();
					});
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
					captureConnectionResult();
					done();
				});

				it('should close connection with code = 4100 and reason = "Missing required property: nethash"', done => {
					validClientRPCStub.status(() => {
						expect(closeErrorCode).equal(4100);
						expect(closeErrorReason).equal(
							'Missing required property: nethash'
						);
						done();
					});
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
					captureConnectionResult();
					done();
				});

				it('should close connection with code = 4100 and reason = "Missing required property: version"', done => {
					validClientRPCStub.status(() => {
						expect(closeErrorCode).equal(4100);
						expect(closeErrorReason).equal(
							'Missing required property: version'
						);
						done();
					});
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

		describe('makes request to itself', () => {
			beforeEach(done => {
				System.setHeaders(validHeaders);
				reconnect();
				// First connect is just to get the node's nonce.
				validClientRPCStub.status((err, data) => {
					// Then connect to the node with its own nonce.
					validHeaders.nonce = data.nonce;
					System.setHeaders(validHeaders);
					reconnect();
					validClientRPCStub.status(() => {});
					captureConnectionResult(() => {
						done();
					});
				});
			});

			it('should close connection with code 4101 and reason string', done => {
				expect(closeErrorCode).equal(4101);
				expect(closeErrorReason).equal(
					`Expected nonce to be not equal to: ${validHeaders.nonce}`
				);
				done();
			});
		});

		describe('makes request to the wrong network', () => {
			beforeEach(done => {
				// Set a non-matching nethash.
				validHeaders.nethash =
					'123f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d';
				System.setHeaders(validHeaders);
				reconnect();
				validClientRPCStub.status(() => {});
				captureConnectionResult(() => {
					done();
				});
			});

			it('should close connection with code 4102 and reason string', done => {
				expect(closeErrorCode).equal(4102);
				expect(closeErrorReason).equal(
					'Expected nethash: 198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d but received: 123f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d'
				);
				done();
			});
		});

		describe('makes request with incompatible version', () => {
			beforeEach(done => {
				// Set a non-matching version.
				validHeaders.version = '0.0.0-beta.1';
				System.setHeaders(validHeaders);
				reconnect();
				validClientRPCStub.status(() => {});
				captureConnectionResult(() => {
					done();
				});
			});

			it('should close connection with code 4103 and reason string', done => {
				expect(closeErrorCode).equal(4103);
				expect(closeErrorReason).equal(
					`Expected version: ${
						__testContext.config.minVersion
					} but received: 0.0.0-beta.1`
				);
				done();
			});
		});

		describe('cannot connect - socket hung up', () => {
			beforeEach(done => {
				System.setHeaders(validHeaders);
				// Target unused port.
				reconnect(validWSServerIp, 4567);
				validClientRPCStub.status(() => {});
				captureConnectionResult(() => {
					done();
				});
			});

			it('should close connection with code 1006', done => {
				expect(closeErrorCode).equal(1006);
				done();
			});
		});
	});
});

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

const rewire = require('rewire');
const sinon = require('sinon');
const prefixedPeer = require('../../../../fixtures/peers').randomNormalizedPeer;
const System = require('../../../../../modules/system');
const wsRPC = require('../../../../../api/ws/rpc/ws_rpc').wsRPC;

const connectRewired = rewire('../../../../../api/ws/rpc/connect');

const validRPCProcedureName = 'rpcProcedureA';
const validEventProcedureName = 'eventProcedureB';

describe('connect', () => {
	let validPeer;
	let connectResult;
	let addConnectionOptionsSpySpy;
	let addSocketSpy;
	let upgradeSocketAsClientSpy;
	let upgradeSocketAsServerSpy;
	let registerRPCSpy;
	let registerSocketListenersSpy;
	let loggerMock;
	let masterWAMPServerMock;

	before('spy on connectSteps', done => {
		const connectionSteps = connectRewired.__get__('connectSteps');
		addConnectionOptionsSpySpy = sinon.spy(
			connectionSteps,
			'addConnectionOptions'
		);
		addSocketSpy = sinon.spy(connectionSteps, 'addSocket');
		upgradeSocketAsClientSpy = sinon.spy(
			connectionSteps,
			'upgradeSocketAsWAMPClient'
		);
		upgradeSocketAsServerSpy = sinon.spy(
			connectionSteps,
			'upgradeSocketAsWAMPServer'
		);
		registerRPCSpy = sinon.spy(connectionSteps, 'registerRPC');
		registerSocketListenersSpy = sinon.spy(
			connectionSteps,
			'registerSocketListeners'
		);
		done();
	});

	after('restore spies on connectSteps', done => {
		addConnectionOptionsSpySpy.restore();
		addSocketSpy.restore();
		upgradeSocketAsClientSpy.restore();
		upgradeSocketAsServerSpy.restore();
		registerRPCSpy.restore();
		registerSocketListenersSpy.restore();
		done();
	});

	beforeEach('provide non-mutated peer each time', done => {
		validPeer = Object.assign({}, prefixedPeer);
		loggerMock = {
			error: sinonSandbox.stub(),
			warn: sinonSandbox.stub(),
			log: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
			trace: sinonSandbox.stub(),
		};
		masterWAMPServerMock = {
			upgradeToWAMP: sinon.stub(),
			endpoints: {
				rpc: {
					[validRPCProcedureName]: sinon.stub().callsArg(1),
				},
				event: {
					[validEventProcedureName]: sinon.stub(),
				},
			},
		};
		wsRPC.getServer = sinon.stub().returns(masterWAMPServerMock);
		done();
	});

	describe('connect', () => {
		describe('connectSteps order', () => {
			beforeEach(done => {
				connectResult = connectRewired(validPeer, loggerMock);
				done();
			});

			afterEach(done => {
				addConnectionOptionsSpySpy.resetHistory();
				addSocketSpy.resetHistory();
				done();
			});

			it('should call all connectSteps', () => {
				expect(addConnectionOptionsSpySpy).to.be.calledOnce;
				expect(addSocketSpy).to.be.calledOnce;
				expect(upgradeSocketAsClientSpy).to.be.calledOnce;
				expect(upgradeSocketAsServerSpy).to.be.calledOnce;
				expect(registerRPCSpy).to.be.calledOnce;
				return expect(registerSocketListenersSpy).to.be.calledOnce;
			});

			it('should call addSocket after addConnectionOptions', () => sinon.assert.callOrder(addConnectionOptionsSpySpy, addSocketSpy));

			it('should call upgradeSocketAsClientSpy after addSocket', () => sinon.assert.callOrder(addSocketSpy, upgradeSocketAsClientSpy));

			it('should call upgradeSocketAsServerSpy after addSocket', () => sinon.assert.callOrder(addSocketSpy, upgradeSocketAsServerSpy));

			it('should call registerRPCSpy after upgradeSocketAsClientSpy', () => sinon.assert.callOrder(
					upgradeSocketAsClientSpy,
					registerSocketListenersSpy
				));

			it('should call registerRPCSpy after upgradeSocketAsServerSpy', () => sinon.assert.callOrder(
					upgradeSocketAsServerSpy,
					registerSocketListenersSpy
				));

			it('should call registerSocketListenersSpy after addSocket', () => sinon.assert.callOrder(addSocketSpy, registerSocketListenersSpy));

			it('should return passed peer', () => expect(connectResult).equal(validPeer));
		});
	});

	describe('connectionSteps', () => {
		let peerAsResult;

		describe('addConnectionOptions', () => {
			let originalSystemHeaders;

			beforeEach(done => {
				originalSystemHeaders = System.getHeaders();
				System.setHeaders({
					protocolVersion: 'aProtocolVersion',
					version: 'aVersion',
					nonce: 'aNonce',
					wsPort: 'aWSPort',
					httpPort: 'anHttpPort',
					nethash: 'aNethash',
				});
				const addConnectionOptions = connectRewired.__get__(
					'connectSteps.addConnectionOptions'
				);
				peerAsResult = addConnectionOptions(validPeer);
				done();
			});

			afterEach(() => System.setHeaders(originalSystemHeaders));

			it('should add connectionOptions field to peer', () => expect(peerAsResult).to.have.property('connectionOptions'));

			it('should add connectionOptions containing autoConnect = false', () => expect(peerAsResult).to.have.nested.property(
					'connectionOptions.autoConnect'
				).to.be.false);

			it('should add connectionOptions containing port = [peer.wsPort]', () => expect(peerAsResult)
					.to.have.nested.property('connectionOptions.port')
					.to.equal(validPeer.wsPort));

			it('should add connectionOptions containing hostname = [peer.ip]', () => expect(peerAsResult)
					.to.have.nested.property('connectionOptions.hostname')
					.to.equal(validPeer.ip));

			it('should add connectionOptions containing query', () => expect(peerAsResult).to.have.nested.property(
					'connectionOptions.query'
				));

			describe('connectionOptions.query', () => {
				it('should contain protocolVersion if present on system headers', () => expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.protocolVersion')
						.to.eql(System.getHeaders().protocolVersion));

				it('should contain version if present on system headers', () => expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.version')
						.to.eql(System.getHeaders().version));

				it('should contain nonce if present on system headers', () => expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.nonce')
						.to.eql(System.getHeaders().nonce));

				it('should contain wsPort if present on system headers', () => expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.wsPort')
						.to.eql(System.getHeaders().wsPort));

				it('should contain httpPort if present on system headers', () => expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.httpPort')
						.to.eql(System.getHeaders().httpPort));

				it('should contain nethash if present on system headers', () => expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.nethash')
						.to.eql(System.getHeaders().nethash));
			});

			it('should return [peer]', () => expect(peerAsResult).to.eql(validPeer));
		});

		describe('addSocket', () => {
			let scClientConnectStub;
			let validConnectionOptions;
			before(done => {
				validConnectionOptions = {
					validProperty: 'validString',
				};
				scClientConnectStub = sinon.stub(
					connectRewired.__get__('scClient'),
					'connect'
				);
				done();
			});
			beforeEach(done => {
				scClientConnectStub.callsFake(() => ({ options: {} }));
				const addSocket = connectRewired.__get__('connectSteps.addSocket');
				validPeer.connectionOptions = validConnectionOptions;
				peerAsResult = addSocket(validPeer, loggerMock);
				done();
			});
			afterEach(done => {
				scClientConnectStub.resetHistory();
				done();
			});
			after(done => {
				scClientConnectStub.restore();
				done();
			});

			it('should call scClient.connect', () => expect(scClientConnectStub).to.be.calledOnce);

			it('should call scClient.connect with [peer.connectionOptions]', () => expect(scClientConnectStub).to.be.calledWithExactly(
					validPeer.connectionOptions
				));

			it('should add socket field', () => expect(peerAsResult).to.have.property('socket'));

			it('should return [peer]', () => expect(peerAsResult).to.eql(validPeer));
		});

		describe('upgradeSocketAsWAMPClient', () => {
			let upgradeToWAMPSpy;
			let validSocket;
			before(done => {
				validSocket = {
					validProperty: 'validString',
				};
				upgradeToWAMPSpy = sinon.stub(
					connectRewired.__get__('wampClient'),
					'upgradeToWAMP'
				);
				done();
			});
			beforeEach(done => {
				const upgradeSocketAsWAMPClient = connectRewired.__get__(
					'connectSteps.upgradeSocketAsWAMPClient'
				);
				validPeer.socket = validSocket;
				peerAsResult = upgradeSocketAsWAMPClient(validPeer);
				done();
			});
			afterEach(done => {
				upgradeToWAMPSpy.resetHistory();
				done();
			});
			after(done => {
				upgradeToWAMPSpy.restore();
				done();
			});

			it('should call scClient.connect', () => expect(upgradeToWAMPSpy).to.be.calledOnce);

			it('should call scClient.connect with [peer.connectionOptions]', () => expect(upgradeToWAMPSpy).to.be.calledWithExactly(
					validPeer.socket
				));

			it('should return [peer]', () => expect(peerAsResult).to.eql(validPeer));
		});

		describe('registerRPC', () => {
			let validRPCSocket;

			before(done => {
				validRPCSocket = {
					call: sinon.stub(),
					emit: sinon.stub(),
				};
				done();
			});
			beforeEach(done => {
				const registerRPC = connectRewired.__get__('connectSteps.registerRPC');
				validRPCSocket.call.resetHistory();
				validRPCSocket.emit.resetHistory();
				validPeer.socket = validRPCSocket;
				peerAsResult = registerRPC(validPeer, loggerMock, masterWAMPServerMock);
				done();
			});

			describe('when wsRPC.getServer returns servers with event and rpc methods', () => {
				it('should return peer with rpc', () => expect(peerAsResult)
						.to.have.property('rpc')
						.to.be.an('object'));

				it('should return peer with rpc methods registered on MasterWAMPServer', () => expect(peerAsResult)
						.to.have.nested.property(`rpc.${validRPCProcedureName}`)
						.to.be.a('function'));

				it('should return peer with emit methods registered on MasterWAMPServer', () => expect(peerAsResult)
						.to.have.nested.property(`rpc.${validEventProcedureName}`)
						.to.be.a('function'));

				describe('when RPC method is being called on peer and succeeds', () => {
					let validRPCArgument;
					let validRPCCallback;
					const validRPCResult = 'valid rpc result';
					before(done => {
						validRPCArgument = 'valid string argument';
						validRPCCallback = sinon.stub();
						done();
					});
					beforeEach(beforeEachCb => {
						peerAsResult.socket.call.resolves(validRPCResult);
						validRPCCallback.resetHistory();
						peerAsResult.rpc[validRPCProcedureName](
							validRPCArgument,
							(...args) => {
								validRPCCallback(...args);
								beforeEachCb();
							}
						);
					});

					it('should call peer.socket.call', () => expect(peerAsResult.socket.call).calledOnce);

					it('should call peer.socket.call with [validRPCProcedureName] and [validRPCArgument]', () => expect(peerAsResult.socket.call).calledWith(
							validRPCProcedureName,
							validRPCArgument
						));

					it('should call RPC callback', () => expect(validRPCCallback).calledOnce);

					it('should call RPC callback with error = null and result = [validRPCResult]', () => expect(validRPCCallback).calledWith(null, validRPCResult));

					describe('when RPC method is called without an argument', () => {
						let originalValidRPCArgument;
						before(done => {
							originalValidRPCArgument = validRPCArgument;
							validRPCArgument = null;
							done();
						});
						after(done => {
							validRPCArgument = originalValidRPCArgument;
							done();
						});
						it('should call peer.socket.call with [validRPCProcedureName] and {}', () => expect(peerAsResult.socket.call).calledWith(
								validRPCProcedureName,
								{}
							));

						it('should call RPC method callback', () => expect(validRPCCallback).calledOnce);
					});

					describe('when peer.socket.call failed', () => {
						const validRPCError = 'valid rpc error';
						beforeEach(beforeEachCb => {
							validRPCCallback.resetHistory();
							peerAsResult.socket.call.rejects(validRPCError);
							peerAsResult.rpc[validRPCProcedureName](
								validRPCArgument,
								(...args) => {
									validRPCCallback(...args);
									beforeEachCb();
								}
							);
						});

						it('should call RPC method callback with err = [validRPCError]', () => expect(validRPCCallback)
								.to.have.nested.property('args.0.0.name')
								.equal(validRPCError));
					});
				});

				describe('when Emit method is being called on peer', () => {
					const validEmitArgument = 'valid string argument';
					beforeEach(beforeEachCb => {
						peerAsResult.rpc[validEventProcedureName](validEmitArgument);
						setTimeout(beforeEachCb, 100); // Wait for the procedure to be emitted asynchronously
					});

					it('should call peer.socket.emit', () => expect(peerAsResult.socket.emit).calledOnce);

					it('should call peer.socket.emit with [validEventProcedureName] and [validEmitArgument]', () => expect(peerAsResult.socket.emit).calledWith(
							validEventProcedureName,
							validEmitArgument
						));
				});
			});
		});

		describe('registerSocketListeners', () => {
			let validSocket;
			before(done => {
				validSocket = {
					off: sinon.stub(),
					on: sinon.stub(),
				};
				done();
			});
			beforeEach(done => {
				validSocket.on.resetHistory();
				const registerSocketListeners = connectRewired.__get__(
					'connectSteps.registerSocketListeners'
				);
				validPeer.socket = validSocket;
				peerAsResult = registerSocketListeners(validPeer, loggerMock);
				done();
			});

			it('should call peer.socket.on with "connectAbort"', () => expect(peerAsResult.socket.on).to.be.calledWith('connectAbort'));

			it('should call peer.socket.on with "error"', () => expect(peerAsResult.socket.on).to.be.calledWith('error'));

			it('should call peer.socket.on with "close"', () => expect(peerAsResult.socket.on).to.be.calledWith('close'));

			it('should register 6 event listeners', () => expect(peerAsResult.socket.on).to.be.callCount(6));
		});
	});
});

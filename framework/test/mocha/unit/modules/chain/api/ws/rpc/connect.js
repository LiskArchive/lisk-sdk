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
const prefixedPeer = require('../../../../../../fixtures/peers')
	.randomNormalizedPeer;
const wsRPC = require('../../../../../../../../src/modules/chain/api/ws/rpc/ws_rpc')
	.wsRPC;

const connectRewired = rewire(
	'../../../../../../../../src/modules/chain/api/ws/rpc/connect'
);

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
	let applicationStateMock;
	let masterWAMPServerMock;

	before('spy on connectSteps', async () => {
		const connectionSteps = connectRewired.__get__('connectSteps');
		addConnectionOptionsSpySpy = sinonSandbox.spy(
			connectionSteps,
			'addConnectionOptions'
		);
		addSocketSpy = sinonSandbox.spy(connectionSteps, 'addSocket');
		upgradeSocketAsClientSpy = sinonSandbox.spy(
			connectionSteps,
			'upgradeSocketAsWAMPClient'
		);
		upgradeSocketAsServerSpy = sinonSandbox.spy(
			connectionSteps,
			'upgradeSocketAsWAMPServer'
		);
		registerRPCSpy = sinonSandbox.spy(connectionSteps, 'registerRPC');
		registerSocketListenersSpy = sinonSandbox.spy(
			connectionSteps,
			'registerSocketListeners'
		);
	});

	beforeEach('provide non-mutated peer each time', async () => {
		validPeer = Object.assign({}, prefixedPeer);
		loggerMock = {
			error: sinonSandbox.stub(),
			warn: sinonSandbox.stub(),
			log: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
			trace: sinonSandbox.stub(),
		};

		applicationStateMock = {
			state: sinonSandbox.stub().returns({}),
		};

		masterWAMPServerMock = {
			upgradeToWAMP: sinonSandbox.stub(),
			endpoints: {
				rpc: {
					[validRPCProcedureName]: sinonSandbox.stub().callsArg(1),
				},
				event: {
					[validEventProcedureName]: sinonSandbox.stub(),
				},
			},
		};
		wsRPC.getServer = sinonSandbox.stub().returns(masterWAMPServerMock);
	});

	afterEach('restore spies on connectSteps', async () => {
		addConnectionOptionsSpySpy.restore();
		addSocketSpy.restore();
		upgradeSocketAsClientSpy.restore();
		upgradeSocketAsServerSpy.restore();
		registerRPCSpy.restore();
		registerSocketListenersSpy.restore();
	});

	after(async () => {
		sinonSandbox.restore();
	});

	describe('connect', () => {
		describe('connectSteps order', () => {
			beforeEach(async () => {
				connectResult = connectRewired(
					validPeer,
					loggerMock,
					applicationStateMock.state
				);
			});

			it('should call all connectSteps', async () => {
				expect(addConnectionOptionsSpySpy).to.be.calledOnce;
				expect(addSocketSpy).to.be.calledOnce;
				expect(upgradeSocketAsClientSpy).to.be.calledOnce;
				expect(upgradeSocketAsServerSpy).to.be.calledOnce;
				expect(registerRPCSpy).to.be.calledOnce;
				return expect(registerSocketListenersSpy).to.be.calledOnce;
			});

			it('should call addSocket after addConnectionOptions', async () =>
				sinonSandbox.assert.callOrder(
					addConnectionOptionsSpySpy,
					addSocketSpy
				));

			it('should call upgradeSocketAsClientSpy after addSocket', async () =>
				sinonSandbox.assert.callOrder(addSocketSpy, upgradeSocketAsClientSpy));

			it('should call upgradeSocketAsServerSpy after addSocket', async () =>
				sinonSandbox.assert.callOrder(
					upgradeSocketAsClientSpy,
					upgradeSocketAsServerSpy
				));

			it('should call registerRPCSpy after upgradeSocketAsClientSpy', async () =>
				sinonSandbox.assert.callOrder(
					upgradeSocketAsServerSpy,
					registerRPCSpy
				));

			it('should call registerSocketListenersSpy after addSocket', async () =>
				sinonSandbox.assert.callOrder(
					registerRPCSpy,
					registerSocketListenersSpy
				));

			it('should return passed peer', async () =>
				expect(connectResult).equal(validPeer));
		});
	});

	describe('connectionSteps', () => {
		let peerAsResult;
		let stateMock;

		describe('addConnectionOptions', () => {
			let originalApplicationState;

			beforeEach(async () => {
				originalApplicationState = applicationStateMock.state;
				stateMock = {
					protocolVersion: 'aProtocolVersion',
					version: 'aVersion',
					nonce: 'aNonce',
					wsPort: 'aWSPort',
					httpPort: 'anHttpPort',
					nethash: 'aNethash',
				};
				const addConnectionOptions = connectRewired.__get__(
					'connectSteps.addConnectionOptions'
				);
				peerAsResult = addConnectionOptions(validPeer, stateMock);
			});

			afterEach(async () => {
				stateMock = originalApplicationState;
			});

			it('should add connectionOptions field to peer', async () =>
				expect(peerAsResult).to.have.property('connectionOptions'));

			it('should add connectionOptions containing autoConnect = false', async () =>
				expect(peerAsResult).to.have.nested.property(
					'connectionOptions.autoConnect'
				).to.be.false);

			it('should add connectionOptions containing port = [peer.wsPort]', async () =>
				expect(peerAsResult)
					.to.have.nested.property('connectionOptions.port')
					.to.equal(validPeer.wsPort));

			it('should add connectionOptions containing hostname = [peer.ip]', async () =>
				expect(peerAsResult)
					.to.have.nested.property('connectionOptions.hostname')
					.to.equal(validPeer.ip));

			it('should add connectionOptions containing query', async () =>
				expect(peerAsResult).to.have.nested.property(
					'connectionOptions.query'
				));

			describe('connectionOptions.query', () => {
				it('should contain protocolVersion if present on peers headers', async () =>
					expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.protocolVersion')
						.to.eql(stateMock.protocolVersion));

				it('should contain version if present on peers headers', async () =>
					expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.version')
						.to.eql(stateMock.version));

				it('should contain nonce if present on peers headers', async () =>
					expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.nonce')
						.to.eql(stateMock.nonce));

				it('should contain nethash if present on peers headers', async () =>
					expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.nethash')
						.to.eql(stateMock.nethash));

				it('should contain wsPort if present on peers headers', async () =>
					expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.wsPort')
						.to.eql(stateMock.wsPort));

				it('should contain httpPort if present on peers headers', async () =>
					expect(peerAsResult)
						.to.have.nested.property('connectionOptions.query.httpPort')
						.to.eql(stateMock.httpPort));
			});

			it('should return [peer]', async () =>
				expect(peerAsResult).to.eql(validPeer));
		});

		describe('addSocket', () => {
			let scClientConnectStub;
			let validConnectionOptions;
			before(async () => {
				validConnectionOptions = {
					validProperty: 'validString',
				};
				scClientConnectStub = sinonSandbox.stub(
					connectRewired.__get__('scClient'),
					'connect'
				);
			});
			beforeEach(async () => {
				scClientConnectStub.callsFake(() => ({
					options: {},
				}));
				const addSocket = connectRewired.__get__('connectSteps.addSocket');
				validPeer.connectionOptions = validConnectionOptions;
				peerAsResult = addSocket(validPeer, loggerMock);
			});
			afterEach(async () => {
				scClientConnectStub.resetHistory();
			});
			after(async () => {
				scClientConnectStub.restore();
			});

			it('should call scClient.connect', async () =>
				expect(scClientConnectStub).to.be.calledOnce);

			it('should call scClient.connect with [peer.connectionOptions]', async () =>
				expect(scClientConnectStub).to.be.calledWithExactly(
					validPeer.connectionOptions
				));

			it('should add socket field', async () =>
				expect(peerAsResult).to.have.property('socket'));

			it('should return [peer]', async () =>
				expect(peerAsResult).to.eql(validPeer));
		});

		describe('upgradeSocketAsWAMPClient', () => {
			let upgradeToWAMPSpy;
			let validSocket;
			before(async () => {
				validSocket = {
					validProperty: 'validString',
				};
				upgradeToWAMPSpy = sinonSandbox.stub(
					connectRewired.__get__('wampClient'),
					'upgradeToWAMP'
				);
			});
			beforeEach(async () => {
				const upgradeSocketAsWAMPClient = connectRewired.__get__(
					'connectSteps.upgradeSocketAsWAMPClient'
				);
				validPeer.socket = validSocket;
				peerAsResult = upgradeSocketAsWAMPClient(validPeer);
			});
			afterEach(async () => {
				upgradeToWAMPSpy.resetHistory();
			});
			after(async () => {
				upgradeToWAMPSpy.restore();
			});

			it('should call scClient.connect', async () =>
				expect(upgradeToWAMPSpy).to.be.calledOnce);

			it('should call scClient.connect with [peer.connectionOptions]', async () =>
				expect(upgradeToWAMPSpy).to.be.calledWithExactly(validPeer.socket));

			it('should return [peer]', async () =>
				expect(peerAsResult).to.eql(validPeer));
		});

		describe('registerRPC', () => {
			let validRPCSocket;

			before(async () => {
				validRPCSocket = {
					call: sinonSandbox.stub(),
					emit: sinonSandbox.stub(),
				};
			});
			beforeEach(async () => {
				const registerRPC = connectRewired.__get__('connectSteps.registerRPC');
				validRPCSocket.call.resetHistory();
				validRPCSocket.emit.resetHistory();
				validPeer.socket = validRPCSocket;
				peerAsResult = registerRPC(validPeer, loggerMock, masterWAMPServerMock);
			});

			describe('when wsRPC.getServer returns servers with event and rpc methods', () => {
				it('should return peer with rpc', async () =>
					expect(peerAsResult)
						.to.have.property('rpc')
						.to.be.an('object'));

				it('should return peer with rpc methods registered on MasterWAMPServer', async () =>
					expect(peerAsResult)
						.to.have.nested.property(`rpc.${validRPCProcedureName}`)
						.to.be.a('function'));

				it('should return peer with emit methods registered on MasterWAMPServer', async () =>
					expect(peerAsResult)
						.to.have.nested.property(`rpc.${validEventProcedureName}`)
						.to.be.a('function'));

				describe('when RPC method is being called on peer and succeeds', () => {
					let validRPCArgument;
					let validRPCCallback;
					const validRPCResult = 'valid rpc result';
					before(async () => {
						validRPCArgument = 'valid string argument';
						validRPCCallback = sinonSandbox.stub();
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

					it('should call peer.socket.call', async () =>
						expect(peerAsResult.socket.call).calledOnce);

					it('should call peer.socket.call with [validRPCProcedureName] and [validRPCArgument]', async () =>
						expect(peerAsResult.socket.call).calledWith(
							validRPCProcedureName,
							validRPCArgument
						));

					it('should call RPC callback', async () =>
						expect(validRPCCallback).calledOnce);

					it('should call RPC callback with error = null and result = [validRPCResult]', async () =>
						expect(validRPCCallback).calledWith(null, validRPCResult));

					describe('when RPC method is called without an argument', () => {
						let originalValidRPCArgument;
						before(async () => {
							originalValidRPCArgument = validRPCArgument;
							validRPCArgument = null;
						});
						after(async () => {
							validRPCArgument = originalValidRPCArgument;
						});
						it('should call peer.socket.call with [validRPCProcedureName] and {}', async () =>
							expect(peerAsResult.socket.call).calledWith(
								validRPCProcedureName,
								{}
							));

						it('should call RPC method callback', async () =>
							expect(validRPCCallback).calledOnce);
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

						it('should call RPC method callback with err = [validRPCError]', async () =>
							expect(validRPCCallback)
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

					it('should call peer.socket.emit', async () =>
						expect(peerAsResult.socket.emit).calledOnce);

					it('should call peer.socket.emit with [validEventProcedureName] and [validEmitArgument]', async () =>
						expect(peerAsResult.socket.emit).calledWith(
							validEventProcedureName,
							validEmitArgument
						));
				});
			});
		});

		describe('registerSocketListeners', () => {
			let validSocket;
			before(async () => {
				validSocket = {
					off: sinonSandbox.stub(),
					on: sinonSandbox.stub(),
				};
			});
			beforeEach(async () => {
				validSocket.on.resetHistory();
				const registerSocketListeners = connectRewired.__get__(
					'connectSteps.registerSocketListeners'
				);
				validPeer.socket = validSocket;
				peerAsResult = registerSocketListeners(validPeer, loggerMock);
			});

			it('should call peer.socket.on with "connectAbort"', async () =>
				expect(peerAsResult.socket.on).to.be.calledWith('connectAbort'));

			it('should call peer.socket.on with "error"', async () =>
				expect(peerAsResult.socket.on).to.be.calledWith('error'));

			it('should call peer.socket.on with "close"', async () =>
				expect(peerAsResult.socket.on).to.be.calledWith('close'));

			it('should register 6 event listeners', async () =>
				expect(peerAsResult.socket.on).to.be.callCount(6));
		});
	});
});

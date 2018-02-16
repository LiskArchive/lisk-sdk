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

describe('connect', () => {
	let validPeer;
	let connectResult;
	let addConnectionOptionsSpySpy;
	let addSocketSpy;
	let upgradeSocketSpy;
	let registerRPCSpy;
	let registerSocketListenersSpy;

	before('spy on connectSteps', () => {
		const connectionSteps = connectRewired.__get__('connectSteps');
		addConnectionOptionsSpySpy = sinon.spy(
			connectionSteps,
			'addConnectionOptions'
		);
		addSocketSpy = sinon.spy(connectionSteps, 'addSocket');
		upgradeSocketSpy = sinon.spy(connectionSteps, 'upgradeSocket');
		registerRPCSpy = sinon.spy(connectionSteps, 'registerRPC');
		registerSocketListenersSpy = sinon.spy(
			connectionSteps,
			'registerSocketListeners'
		);
	});

	after('restore spies on connectSteps', () => {
		addConnectionOptionsSpySpy.restore();
		addSocketSpy.restore();
		upgradeSocketSpy.restore();
		registerRPCSpy.restore();
		registerSocketListenersSpy.restore();
	});

	beforeEach('provide non-mutated peer each time', () => {
		validPeer = Object.assign({}, prefixedPeer);
	});

	describe('connect', () => {
		describe('connectSteps order', () => {
			beforeEach(() => {
				connectResult = connectRewired(validPeer);
			});

			afterEach(() => {
				addConnectionOptionsSpySpy.reset();
				addSocketSpy.reset();
			});

			it('should call all connectSteps', () => {
				expect(addConnectionOptionsSpySpy).to.be.calledOnce;
				expect(addSocketSpy).to.be.calledOnce;
				expect(upgradeSocketSpy).to.be.calledOnce;
				expect(registerRPCSpy).to.be.calledOnce;
				expect(registerSocketListenersSpy).to.be.calledOnce;
			});

			it('should call addSocket after addConnectionOptions', () => {
				sinon.assert.callOrder(addConnectionOptionsSpySpy, addSocketSpy);
			});

			it('should call upgradeSocketSpy after addSocket', () => {
				sinon.assert.callOrder(addSocketSpy, upgradeSocketSpy);
			});

			it('should call registerRPCSpy after upgradeSocketSpy', () => {
				sinon.assert.callOrder(upgradeSocketSpy, registerSocketListenersSpy);
			});

			it('should call registerSocketListenersSpy after addSocket', () => {
				sinon.assert.callOrder(addSocketSpy, registerSocketListenersSpy);
			});

			it('should return passed peer', () => {
				expect(connectResult).equal(validPeer);
			});
		});
	});

	describe('connectionSteps', () => {
		let peerAsResult;

		describe('addConnectionOptions', () => {
			beforeEach(() => {
				const addConnectionOptions = connectRewired.__get__(
					'connectSteps.addConnectionOptions'
				);
				peerAsResult = addConnectionOptions(validPeer);
			});

			it('should add connectionOptions field to peer', () => {
				expect(peerAsResult).to.have.property('connectionOptions');
			});

			it('should add connectionOptions containing autoConnect = false', () => {
				expect(peerAsResult).to.have.nested.property(
					'connectionOptions.autoConnect'
				).to.be.false;
			});

			it('should add connectionOptions containing port = [peer.wsPort]', () => {
				expect(peerAsResult)
					.to.have.nested.property('connectionOptions.port')
					.to.equal(validPeer.wsPort);
			});

			it('should add connectionOptions containing hostname = [peer.ip]', () => {
				expect(peerAsResult)
					.to.have.nested.property('connectionOptions.hostname')
					.to.equal(validPeer.ip);
			});

			it('should add connectionOptions containing query', () => {
				expect(peerAsResult)
					.to.have.nested.property('connectionOptions.query')
					.to.eql(System.getHeaders());
			});

			it('should return [peer]', () => {
				expect(peerAsResult).to.eql(validPeer);
			});
		});

		describe('addSocket', () => {
			let scClientConnectSpy;
			let validConnectionOptions;
			before(() => {
				validConnectionOptions = {
					validProperty: 'validString',
				};
				scClientConnectSpy = sinon.stub(
					connectRewired.__get__('scClient'),
					'connect'
				);
			});
			beforeEach(() => {
				const addSocket = connectRewired.__get__('connectSteps.addSocket');
				validPeer.connectionOptions = validConnectionOptions;
				peerAsResult = addSocket(validPeer);
			});
			afterEach(() => {
				scClientConnectSpy.reset();
			});
			after(() => {
				scClientConnectSpy.restore();
			});

			it('should call scClient.connect', () => {
				expect(scClientConnectSpy).to.be.calledOnce;
			});

			it('should call scClient.connect with [peer.connectionOptions]', () => {
				expect(scClientConnectSpy).to.be.calledWithExactly(
					validPeer.connectionOptions
				);
			});

			it('should add socket field', () => {
				expect(peerAsResult).to.have.property('socket');
			});

			it('should return [peer]', () => {
				expect(peerAsResult).to.eql(validPeer);
			});
		});

		describe('upgradeSocket', () => {
			let upgradeToWAMPSpy;
			let validSocket;
			before(() => {
				validSocket = {
					validProperty: 'validString',
				};
				upgradeToWAMPSpy = sinon.stub(
					connectRewired.__get__('wampClient'),
					'upgradeToWAMP'
				);
			});
			beforeEach(() => {
				const upgradeSocket = connectRewired.__get__(
					'connectSteps.upgradeSocket'
				);
				validPeer.socket = validSocket;
				peerAsResult = upgradeSocket(validPeer);
			});
			afterEach(() => {
				upgradeToWAMPSpy.reset();
			});
			after(() => {
				upgradeToWAMPSpy.restore();
			});

			it('should call scClient.connect', () => {
				expect(upgradeToWAMPSpy).to.be.calledOnce;
			});

			it('should call scClient.connect with [peer.connectionOptions]', () => {
				expect(upgradeToWAMPSpy).to.be.calledWithExactly(validPeer.socket);
			});

			it('should return [peer]', () => {
				expect(peerAsResult).to.eql(validPeer);
			});
		});

		describe('registerRPC', () => {
			let validRPCSocket;

			before(() => {
				validRPCSocket = {
					call: sinon.stub(),
					emit: sinon.stub(),
				};
			});
			beforeEach(() => {
				const registerRPC = connectRewired.__get__('connectSteps.registerRPC');
				validRPCSocket.call.reset();
				validRPCSocket.emit.reset();
				validPeer.socket = validRPCSocket;
				peerAsResult = registerRPC(validPeer);
			});

			describe('when wsRPC.getServer throws', () => {
				before(() => {
					wsRPC.getServer = sinon.stub().throws();
				});

				it('should return peer with rpc = {}', () => {
					expect(peerAsResult)
						.to.have.property('rpc')
						.to.be.an('object').and.to.be.empty;
				});
			});

			describe('when wsRPC.getServer returns servers with event and rpc methods', () => {
				let masterWAMPServerMock;
				const validRPCProcedureName = 'rpcProcedureA';
				const validEventProcedureName = 'eventProcedureB';

				before(() => {
					masterWAMPServerMock = {
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
				});

				it('should return peer with rpc', () => {
					expect(peerAsResult)
						.to.have.property('rpc')
						.to.be.an('object');
				});

				it('should return peer with rpc methods registered on MasterWAMPServer', () => {
					expect(peerAsResult)
						.to.have.nested.property(`rpc.${validRPCProcedureName}`)
						.to.be.a('function');
				});

				it('should return peer with emit methods registered on MasterWAMPServer', () => {
					expect(peerAsResult)
						.to.have.nested.property(`rpc.${validEventProcedureName}`)
						.to.be.a('function');
				});

				describe('when RPC method is being called on peer and succeeds', () => {
					let validRPCArgument;
					let validRPCCallback;
					const validRPCResult = 'valid rpc result';
					before(() => {
						validRPCArgument = 'valid string argument';
						validRPCCallback = sinon.stub();
					});
					beforeEach(beforeEachCb => {
						peerAsResult.socket.call.resolves(validRPCResult);
						validRPCCallback.reset();
						peerAsResult.rpc[validRPCProcedureName](
							validRPCArgument,
							(...args) => {
								validRPCCallback(...args);
								beforeEachCb();
							}
						);
					});

					it('should call peer.socket.call', () => {
						expect(peerAsResult.socket.call).calledOnce;
					});

					it('should call peer.socket.call with [validRPCProcedureName] and [validRPCArgument]', () => {
						expect(peerAsResult.socket.call).calledWith(
							validRPCProcedureName,
							validRPCArgument
						);
					});

					it('should call RPC callback', () => {
						expect(validRPCCallback).calledOnce;
					});

					it('should call RPC callback with error = null and result = [validRPCResult]', () => {
						expect(validRPCCallback).calledWith(null, validRPCResult);
					});

					describe('when RPC method is called without an argument', () => {
						let originalValidRPCArgument;
						before(() => {
							originalValidRPCArgument = validRPCArgument;
							validRPCArgument = null;
						});
						after(() => {
							validRPCArgument = originalValidRPCArgument;
						});
						it('should call peer.socket.call with [validRPCProcedureName] and {}', () => {
							expect(peerAsResult.socket.call).calledWith(
								validRPCProcedureName,
								{}
							);
						});

						it('should call RPC method callback', () => {
							expect(validRPCCallback).calledOnce;
						});
					});

					describe('when peer.socket.call failed', () => {
						const validRPCError = 'valid rpc error';
						beforeEach(beforeEachCb => {
							validRPCCallback.reset();
							peerAsResult.socket.call.rejects(validRPCError);
							peerAsResult.rpc[validRPCProcedureName](
								validRPCArgument,
								(...args) => {
									validRPCCallback(...args);
									beforeEachCb();
								}
							);
						});

						it('should call RPC method callback with err = [validRPCError]', () => {
							expect(validRPCCallback)
								.to.have.nested.property('args.0.0.name')
								.equal(validRPCError);
						});
					});
				});

				describe('when Emit method is being called on peer', () => {
					const validEmitArgument = 'valid string argument';
					beforeEach(beforeEachCb => {
						peerAsResult.rpc[validEventProcedureName](validEmitArgument);
						setTimeout(beforeEachCb, 100); // Wait for the procedure to be emitted asynchronously
					});

					it('should call peer.socket.emit', () => {
						expect(peerAsResult.socket.emit).calledOnce;
					});

					it('should call peer.socket.emit with [validEventProcedureName] and [validEmitArgument]', () => {
						expect(peerAsResult.socket.emit).calledWith(
							validEventProcedureName,
							validEmitArgument
						);
					});
				});
			});
		});

		describe('registerSocketListeners', () => {
			let validSocket;
			before(() => {
				validSocket = {
					on: sinon.stub(),
				};
			});
			beforeEach(() => {
				validSocket.on.reset();
				const registerSocketListeners = connectRewired.__get__(
					'connectSteps.registerSocketListeners'
				);
				validPeer.socket = validSocket;
				peerAsResult = registerSocketListeners(validPeer);
			});

			it('should call peer.socket.on with "connectionAbort"', () => {
				expect(peerAsResult.socket.on).to.be.calledWith('connectionAbort');
			});

			it('should call peer.socket.on with "error"', () => {
				expect(peerAsResult.socket.on).to.be.calledWith('error');
			});

			it('should call peer.socket.on with "close"', () => {
				expect(peerAsResult.socket.on).to.be.calledWith('close');
			});

			it('should register 3 event listeners', () => {
				expect(peerAsResult.socket.on).to.be.calledThrice;
			});
		});
	});
});

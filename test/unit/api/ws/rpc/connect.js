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

	before('spy on connectSteps', done => {
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
		done();
	});

	after('restore spies on connectSteps', done => {
		addConnectionOptionsSpySpy.restore();
		addSocketSpy.restore();
		upgradeSocketSpy.restore();
		registerRPCSpy.restore();
		registerSocketListenersSpy.restore();
		done();
	});

	beforeEach('provide non-mutated peer each time', done => {
		validPeer = Object.assign({}, prefixedPeer);
		done();
	});

	describe('connect', () => {
		describe('connectSteps order', () => {
			beforeEach(done => {
				connectResult = connectRewired(validPeer, {
					debug: sinonSandbox.stub(),
				});
				done();
			});

			afterEach(done => {
				addConnectionOptionsSpySpy.reset();
				addSocketSpy.reset();
				done();
			});

			it('should call all connectSteps', () => {
				expect(addConnectionOptionsSpySpy).to.be.calledOnce;
				expect(addSocketSpy).to.be.calledOnce;
				expect(upgradeSocketSpy).to.be.calledOnce;
				expect(registerRPCSpy).to.be.calledOnce;
				return expect(registerSocketListenersSpy).to.be.calledOnce;
			});

			it('should call addSocket after addConnectionOptions', () => {
				return sinon.assert.callOrder(addConnectionOptionsSpySpy, addSocketSpy);
			});

			it('should call upgradeSocketSpy after addSocket', () => {
				return sinon.assert.callOrder(addSocketSpy, upgradeSocketSpy);
			});

			it('should call registerRPCSpy after upgradeSocketSpy', () => {
				return sinon.assert.callOrder(
					upgradeSocketSpy,
					registerSocketListenersSpy
				);
			});

			it('should call registerSocketListenersSpy after addSocket', () => {
				return sinon.assert.callOrder(addSocketSpy, registerSocketListenersSpy);
			});

			it('should return passed peer', () => {
				return expect(connectResult).equal(validPeer);
			});
		});
	});

	describe('connectionSteps', () => {
		let peerAsResult;

		describe('addConnectionOptions', () => {
			beforeEach(done => {
				const addConnectionOptions = connectRewired.__get__(
					'connectSteps.addConnectionOptions'
				);
				peerAsResult = addConnectionOptions(validPeer);
				done();
			});

			it('should add connectionOptions field to peer', () => {
				return expect(peerAsResult).to.have.property('connectionOptions');
			});

			it('should add connectionOptions containing autoConnect = false', () => {
				return expect(peerAsResult).to.have.nested.property(
					'connectionOptions.autoConnect'
				).to.be.false;
			});

			it('should add connectionOptions containing port = [peer.wsPort]', () => {
				return expect(peerAsResult)
					.to.have.nested.property('connectionOptions.port')
					.to.equal(validPeer.wsPort);
			});

			it('should add connectionOptions containing hostname = [peer.ip]', () => {
				return expect(peerAsResult)
					.to.have.nested.property('connectionOptions.hostname')
					.to.equal(validPeer.ip);
			});

			it('should add connectionOptions containing query', () => {
				return expect(peerAsResult)
					.to.have.nested.property('connectionOptions.query')
					.to.eql(System.getHeaders());
			});

			it('should return [peer]', () => {
				return expect(peerAsResult).to.eql(validPeer);
			});
		});

		describe('addSocket', () => {
			let scClientConnectSpy;
			let validConnectionOptions;
			before(done => {
				validConnectionOptions = {
					validProperty: 'validString',
				};
				scClientConnectSpy = sinon.stub(
					connectRewired.__get__('scClient'),
					'connect'
				);
				done();
			});
			beforeEach(done => {
				const addSocket = connectRewired.__get__('connectSteps.addSocket');
				validPeer.connectionOptions = validConnectionOptions;
				peerAsResult = addSocket(validPeer);
				done();
			});
			afterEach(done => {
				scClientConnectSpy.reset();
				done();
			});
			after(done => {
				scClientConnectSpy.restore();
				done();
			});

			it('should call scClient.connect', () => {
				return expect(scClientConnectSpy).to.be.calledOnce;
			});

			it('should call scClient.connect with [peer.connectionOptions]', () => {
				return expect(scClientConnectSpy).to.be.calledWithExactly(
					validPeer.connectionOptions
				);
			});

			it('should add socket field', () => {
				return expect(peerAsResult).to.have.property('socket');
			});

			it('should return [peer]', () => {
				return expect(peerAsResult).to.eql(validPeer);
			});
		});

		describe('upgradeSocket', () => {
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
				const upgradeSocket = connectRewired.__get__(
					'connectSteps.upgradeSocket'
				);
				validPeer.socket = validSocket;
				peerAsResult = upgradeSocket(validPeer);
				done();
			});
			afterEach(done => {
				upgradeToWAMPSpy.reset();
				done();
			});
			after(done => {
				upgradeToWAMPSpy.restore();
				done();
			});

			it('should call scClient.connect', () => {
				return expect(upgradeToWAMPSpy).to.be.calledOnce;
			});

			it('should call scClient.connect with [peer.connectionOptions]', () => {
				return expect(upgradeToWAMPSpy).to.be.calledWithExactly(
					validPeer.socket
				);
			});

			it('should return [peer]', () => {
				return expect(peerAsResult).to.eql(validPeer);
			});
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
				validRPCSocket.call.reset();
				validRPCSocket.emit.reset();
				validPeer.socket = validRPCSocket;
				peerAsResult = registerRPC(validPeer);
				done();
			});

			describe('when wsRPC.getServer throws', () => {
				before(done => {
					wsRPC.getServer = sinon.stub().throws();
					done();
				});

				it('should return peer with rpc = {}', () => {
					return expect(peerAsResult)
						.to.have.property('rpc')
						.to.be.an('object').and.to.be.empty;
				});
			});

			describe('when wsRPC.getServer returns servers with event and rpc methods', () => {
				let masterWAMPServerMock;
				const validRPCProcedureName = 'rpcProcedureA';
				const validEventProcedureName = 'eventProcedureB';

				before(done => {
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
					done();
				});

				it('should return peer with rpc', () => {
					return expect(peerAsResult)
						.to.have.property('rpc')
						.to.be.an('object');
				});

				it('should return peer with rpc methods registered on MasterWAMPServer', () => {
					return expect(peerAsResult)
						.to.have.nested.property(`rpc.${validRPCProcedureName}`)
						.to.be.a('function');
				});

				it('should return peer with emit methods registered on MasterWAMPServer', () => {
					return expect(peerAsResult)
						.to.have.nested.property(`rpc.${validEventProcedureName}`)
						.to.be.a('function');
				});

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
						return expect(peerAsResult.socket.call).calledOnce;
					});

					it('should call peer.socket.call with [validRPCProcedureName] and [validRPCArgument]', () => {
						return expect(peerAsResult.socket.call).calledWith(
							validRPCProcedureName,
							validRPCArgument
						);
					});

					it('should call RPC callback', () => {
						return expect(validRPCCallback).calledOnce;
					});

					it('should call RPC callback with error = null and result = [validRPCResult]', () => {
						return expect(validRPCCallback).calledWith(null, validRPCResult);
					});

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
						it('should call peer.socket.call with [validRPCProcedureName] and {}', () => {
							return expect(peerAsResult.socket.call).calledWith(
								validRPCProcedureName,
								{}
							);
						});

						it('should call RPC method callback', () => {
							return expect(validRPCCallback).calledOnce;
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
							return expect(validRPCCallback)
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
						return expect(peerAsResult.socket.emit).calledOnce;
					});

					it('should call peer.socket.emit with [validEventProcedureName] and [validEmitArgument]', () => {
						return expect(peerAsResult.socket.emit).calledWith(
							validEventProcedureName,
							validEmitArgument
						);
					});
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
				validSocket.on.reset();
				const registerSocketListeners = connectRewired.__get__(
					'connectSteps.registerSocketListeners'
				);
				validPeer.socket = validSocket;
				peerAsResult = registerSocketListeners(validPeer);
				done();
			});

			it('should call peer.socket.on with "connectAbort"', () => {
				return expect(peerAsResult.socket.on).to.be.calledWith('connectAbort');
			});

			it('should call peer.socket.on with "error"', () => {
				return expect(peerAsResult.socket.on).to.be.calledWith('error');
			});

			it('should call peer.socket.on with "close"', () => {
				return expect(peerAsResult.socket.on).to.be.calledWith('close');
			});

			it('should register 3 event listeners', () => {
				return expect(peerAsResult.socket.on).to.be.calledThrice;
			});
		});
	});
});

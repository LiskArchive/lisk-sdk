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

			it('should return [peer]', () => {
				expect(peerAsResult).to.eql(validPeer);
			});
		});
	});
});

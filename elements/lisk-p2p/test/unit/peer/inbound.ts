/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */
import { expect } from 'chai';
import { InboundPeer } from '../../../src/peer';
import { P2PDiscoveredPeerInfo } from '../../../src/p2p_types';
import { SCServerSocket } from 'socketcluster-server';

describe('peer/inbound', () => {
	const DEFAULT_RANDOM_SECRET = 123;
	const defaultPeerInfo: P2PDiscoveredPeerInfo = {
		ipAddress: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
		isDiscoveredPeer: true,
		version: '1.1.1',
		protocolVersion: '1.1',
	};
	const defaultPeerConfig = {
		rateCalculationInterval: 1000,
		wsMaxMessageRate: 1000,
		wsMaxMessageRatePenalty: 10,
		secret: DEFAULT_RANDOM_SECRET,
		maxPeerInfoSize: 10000,
		maxPeerDiscoveryResponseLength: 1000,
	};
	let defaultInboundPeer: InboundPeer;
	let inboundSocket: SCServerSocket;

	beforeEach(() => {
		inboundSocket = <SCServerSocket>({
			on: sandbox.stub(),
			off: sandbox.stub(),
			emit: sandbox.stub(),
			destroy: sandbox.stub(),
		} as any);
		sandbox.spy(global, 'setTimeout');
		defaultInboundPeer = new InboundPeer(
			defaultPeerInfo,
			inboundSocket,
			defaultPeerConfig,
		);
	});

	afterEach(() => {
		defaultInboundPeer.disconnect();
	});

	describe('#constructor', () => {
		it('should be an instance of InboundPeer class', () =>
			expect(defaultInboundPeer).and.be.instanceof(InboundPeer));

		it('should have a function named _handleInboundSocketError', () =>
			expect((defaultInboundPeer as any)._handleInboundSocketError).to.be.a(
				'function',
			));

		it('should have a function named _handleInboundSocketClose ', () =>
			expect((defaultInboundPeer as any)._handleInboundSocketClose).to.be.a(
				'function',
			));

		it('should should have a function named _sendPing', () =>
			expect((defaultInboundPeer as any)._sendPing).to.be.a('function'));

		it('should set ping timeout', () => {
			expect((defaultInboundPeer as any)._pingTimeoutId).to.be.an('object');
			expect(setTimeout).to.be.calledOnceWith(
				(defaultInboundPeer as any)._sendPing,
			);
		});

		it('should get socket property', () =>
			expect((defaultInboundPeer as any)._socket).to.equal(inboundSocket));
	});

	describe('#set socket', () => {
		let newInboundSocket: SCServerSocket;

		beforeEach(() => {
			newInboundSocket = <SCServerSocket>({
				on: sandbox.stub(),
				off: sandbox.stub(),
				emit: sandbox.stub(),
				destroy: sandbox.stub(),
			} as any);
		});

		it('should unbind handlers from former inbound socket', () => {
			sandbox.stub(
				defaultInboundPeer as any,
				'_unbindHandlersFromInboundSocket',
			);
			defaultInboundPeer.socket = newInboundSocket;
			expect(
				(defaultInboundPeer as any)._unbindHandlersFromInboundSocket,
			).to.be.calledOnceWithExactly(inboundSocket);
		});

		it('should set new socket', () => {
			expect((defaultInboundPeer as any)._socket).to.be.eql(inboundSocket);
			defaultInboundPeer.socket = newInboundSocket;
			expect((defaultInboundPeer as any)._socket).to.eql(newInboundSocket);
		});

		it('should bind handlers to new inbound socket', () => {
			sandbox.stub(defaultInboundPeer as any, '_bindHandlersToInboundSocket');
			defaultInboundPeer.socket = newInboundSocket;
			expect(
				(defaultInboundPeer as any)._bindHandlersToInboundSocket,
			).to.be.be.calledOnceWithExactly(newInboundSocket);
		});
	});

	describe('#disconnect', () => {
		it('should call disconnect and destroy socket', () => {
			defaultInboundPeer.disconnect();
			expect(inboundSocket.destroy).to.be.calledOnceWith(1000);
		});

		it('should clear timeout', () => {
			const pingTimeoutId = (defaultInboundPeer as any)._pingTimeoutId;
			sandbox.spy(global, 'clearTimeout');
			defaultInboundPeer.disconnect();
			expect(clearTimeout).to.be.calledOnceWithExactly(pingTimeoutId);
		});

		it('should unbind handlers from former inbound socket', () => {
			sandbox.stub(
				defaultInboundPeer as any,
				'_unbindHandlersFromInboundSocket',
			);
			defaultInboundPeer.disconnect();
			expect(
				(defaultInboundPeer as any)._unbindHandlersFromInboundSocket,
			).to.be.calledOnceWithExactly(inboundSocket);
		});
	});
});

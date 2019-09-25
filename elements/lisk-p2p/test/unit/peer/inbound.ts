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
import { InboundPeer, PeerConfig } from '../../../src/peer';
import { P2PDiscoveredPeerInfo } from '../../../src/p2p_types';
import { SCServerSocket } from 'socketcluster-server';
import {
	DEFAULT_RANDOM_SECRET,
	DEFAULT_PING_INTERVAL_MAX,
	DEFAULT_PING_INTERVAL_MIN,
} from '../../../src/constants';

describe('peer/inbound', () => {
	let defaultPeerInfo: P2PDiscoveredPeerInfo;
	let defaultPeerConfig: PeerConfig;
	let defaultInboundPeer: InboundPeer;
	let inboundSocket: SCServerSocket;
	let clock: sinon.SinonFakeTimers;

	beforeEach(() => {
		clock = sandbox.useFakeTimers();
		defaultPeerInfo = {
			ipAddress: '12.12.12.12',
			wsPort: 5001,
			height: 545776,
			isDiscoveredPeer: true,
			version: '1.1.1',
			protocolVersion: '1.1',
		};
		defaultPeerConfig = {
			rateCalculationInterval: 1000,
			wsMaxMessageRate: 1000,
			wsMaxMessageRatePenalty: 10,
			secret: DEFAULT_RANDOM_SECRET,
			maxPeerInfoSize: 10000,
			maxPeerDiscoveryResponseLength: 1000,
		};
		inboundSocket = <SCServerSocket>({
			on: sandbox.stub(),
			off: sandbox.stub(),
			emit: sandbox.stub(),
			destroy: sandbox.stub(),
		} as any);
		defaultInboundPeer = new InboundPeer(
			defaultPeerInfo,
			inboundSocket,
			defaultPeerConfig,
		);
	});

	afterEach(() => {
		clock.restore();
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

		it('should set ping timeout', () => {
			expect((defaultInboundPeer as any)._pingTimeoutId).to.be.an('object');
		});

		it('should get socket property', () =>
			expect((defaultInboundPeer as any)._socket).to.equal(inboundSocket));

		it('should send ping at least once after some time', () => {
			sandbox.stub(defaultInboundPeer as any, '_sendPing');
			expect((defaultInboundPeer as any)._sendPing).to.be.not.called;
			clock.tick(DEFAULT_PING_INTERVAL_MAX + DEFAULT_PING_INTERVAL_MIN + 1);
			expect((defaultInboundPeer as any)._sendPing).to.be.calledOnce.at.least;
		});
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

		it('should not send ping anymore', () => {
			sandbox.stub(defaultInboundPeer as any, '_sendPing');
			defaultInboundPeer.disconnect();
			clock.tick(DEFAULT_PING_INTERVAL_MAX + DEFAULT_PING_INTERVAL_MIN + 1);
			expect((defaultInboundPeer as any)._sendPing).to.not.be.called;
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

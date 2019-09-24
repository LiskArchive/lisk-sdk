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
import { OutboundPeer, PeerConfig } from '../../../src/peer';
import { REMOTE_SC_EVENT_MESSAGE } from '../../../src/events';
import { SCClientSocket } from 'socketcluster-client';
import { DEFAULT_RANDOM_SECRET } from '../../../src/constants';
import { P2PPeerInfo } from '../../../src/p2p_types';

describe('peer/outbound', () => {
	let defaultPeerInfo: P2PPeerInfo;
	let defaultOutboundPeerConfig: PeerConfig;
	let defaultOutboundPeer: OutboundPeer;
	let outboundSocket: SCClientSocket;

	beforeEach(() => {
		defaultPeerInfo = {
			ipAddress: '12.12.12.12',
			wsPort: 5001,
			height: 545776,
			isDiscoveredPeer: true,
			version: '1.1.1',
			protocolVersion: '1.1',
		};
		defaultOutboundPeerConfig = {
			rateCalculationInterval: 1000,
			wsMaxMessageRate: 1000,
			wsMaxMessageRatePenalty: 10,
			secret: DEFAULT_RANDOM_SECRET,
			maxPeerInfoSize: 10000,
			maxPeerDiscoveryResponseLength: 1000,
		};
		outboundSocket = <SCClientSocket>({
			on: sandbox.stub(),
			emit: sandbox.stub(),
			destroy: sandbox.stub(),
			off: sandbox.stub(),
			connect: sandbox.stub(),
		} as any);
		defaultOutboundPeer = new OutboundPeer(
			defaultPeerInfo,
			defaultOutboundPeerConfig,
		);
	});

	afterEach(() => {
		defaultOutboundPeer.disconnect();
	});

	describe('#constructor', () => {
		it('should be an instance of OutboundPeer class', () =>
			expect(defaultOutboundPeer).to.be.instanceof(OutboundPeer));
	});

	describe('#set socket', () => {
		it('should not unbind handlers from outbound socket if it does not exist', () => {
			sandbox.stub(
				defaultOutboundPeer as any,
				'_unbindHandlersFromOutboundSocket',
			);

			expect((defaultOutboundPeer as any)._socket).to.be.undefined;
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._unbindHandlersFromOutboundSocket).to
				.not.called;
		});

		it('should unbind handlers from outbound socket if it exists', () => {
			sandbox.stub(
				defaultOutboundPeer as any,
				'_unbindHandlersFromOutboundSocket',
			);

			(defaultOutboundPeer as any)._socket = outboundSocket;
			expect((defaultOutboundPeer as any)._socket).to.eql(outboundSocket);
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._unbindHandlersFromOutboundSocket).to
				.be.calledOnce;
		});

		it('should set new socket', () => {
			expect((defaultOutboundPeer as any)._socket).to.be.undefined;
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._socket).to.eql(outboundSocket);
		});

		it('should bind handlers to outbound socket', () => {
			sandbox.stub(defaultOutboundPeer as any, '_bindHandlersToOutboundSocket');
			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._bindHandlersToOutboundSocket).to.be
				.calledOnce;
		});
	});

	describe('#connect', () => {
		it('should not create outbound socket if one already exists', () => {
			sandbox.stub(defaultOutboundPeer as any, '_createOutboundSocket');
			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.connect();
			expect((defaultOutboundPeer as any)._createOutboundSocket).to.be.not
				.called;
		});

		it('should create outbound socket if it does not exist', () => {
			sandbox
				.stub(defaultOutboundPeer as any, '_createOutboundSocket')
				.returns(outboundSocket);

			expect((defaultOutboundPeer as any)._socket).to.be.undefined;
			defaultOutboundPeer.connect();
			expect((defaultOutboundPeer as any)._createOutboundSocket).to.be
				.calledOnce;
			expect((defaultOutboundPeer as any)._socket).to.eql(outboundSocket);
		});

		it('should call connect', () => {
			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.connect();
			expect(outboundSocket.connect).to.be.calledOnce;
		});
	});

	describe('#disconnect', () => {
		it('should call disconnect and destroy socket', () => {
			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.disconnect();
			expect(outboundSocket.destroy).to.be.calledOnceWith(1000);
		});

		it('should not unbind handlers if outbound socket does not exist', () => {
			sandbox.stub(
				defaultOutboundPeer as any,
				'_unbindHandlersFromOutboundSocket',
			);

			defaultOutboundPeer.disconnect();
			expect((defaultOutboundPeer as any)._unbindHandlersFromOutboundSocket).to
				.be.not.called;
		});

		it('should unbind handlers from outbound socket if one exists', () => {
			sandbox.stub(
				defaultOutboundPeer as any,
				'_unbindHandlersFromOutboundSocket',
			);

			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.disconnect();
			expect((defaultOutboundPeer as any)._unbindHandlersFromOutboundSocket).to
				.be.calledOnce;
		});
	});

	describe('#send', () => {
		it('should not create outbound socket if one already exists', () => {
			(defaultOutboundPeer as any)._socket = outboundSocket;
			const packet = {
				data: 'myData',
				event: 'myEent',
			};
			sandbox.stub(defaultOutboundPeer as any, '_createOutboundSocket');

			defaultOutboundPeer.send(packet);
			expect((defaultOutboundPeer as any)._createOutboundSocket).to.be.not
				.called;
		});

		it('should create outbound socket if it does not exist any', () => {
			const packet = {
				data: 'myData',
				event: 'myEent',
			};
			sandbox
				.stub(defaultOutboundPeer as any, '_createOutboundSocket')
				.returns(outboundSocket);

			expect((defaultOutboundPeer as any)._socket).to.be.undefined;
			defaultOutboundPeer.send(packet);
			expect((defaultOutboundPeer as any)._createOutboundSocket).to.be
				.calledOnce;
			expect((defaultOutboundPeer as any)._socket).to.eql(outboundSocket);
		});

		it('should emit event', () => {
			const packet = {
				data: 'myData',
				event: 'myEvent',
			};
			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.send(packet);
			expect(outboundSocket.emit).to.be.calledOnceWith(
				REMOTE_SC_EVENT_MESSAGE,
				packet,
			);
		});
	});

	describe('#request', () => {
		it('should not create an outbound socket if one exists', () => {
			const packet = {
				data: 'myData',
				procedure: 'myProcedure',
			};
			sandbox.stub(defaultOutboundPeer as any, '_createOutboundSocket');

			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.request(packet);
			expect((defaultOutboundPeer as any)._createOutboundSocket).to.be.not
				.called;
		});

		it('should create outbound socket if it does not exist any', () => {
			const packet = {
				data: 'myData',
				procedure: 'myProcedure',
			};
			sandbox
				.stub(defaultOutboundPeer as any, '_createOutboundSocket')
				.returns(outboundSocket);

			expect((defaultOutboundPeer as any)._socket).to.be.undefined;
			defaultOutboundPeer.request(packet);
			expect((defaultOutboundPeer as any)._createOutboundSocket).to.be
				.calledOnce;
			expect((defaultOutboundPeer as any)._socket).to.eql(outboundSocket);
		});

		it('should emit event', () => {
			const packet = {
				data: 'myData',
				procedure: 'myProcedure',
			};
			(defaultOutboundPeer as any)._socket = outboundSocket;

			defaultOutboundPeer.request(packet);
			expect(outboundSocket.emit).to.be.called;
		});
	});
});

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
import * as querystring from 'querystring';
import * as socketClusterClient from 'socketcluster-client';
import { expect } from 'chai';
import { OutboundPeer } from '../../../src/peer';
import { DEFAULT_WS_MAX_PAYLOAD } from '../../../src/constants';
import { sanitizeNodeInfoToLegacyFormat } from '../../../src/utils';

describe('peer/outbound', () => {
	const DEFAULT_RANDOM_SECRET = 123;
	const defaultPeerInfo = {
		ipAddress: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
		isDiscoveredPeer: true,
		version: '1.1.1',
		protocolVersion: '1.1',
	};
	const defaultOutboundPeerConfig = {
		rateCalculationInterval: 1000,
		wsMaxMessageRate: 1000,
		wsMaxMessageRatePenalty: 10,
		secret: DEFAULT_RANDOM_SECRET,
		maxPeerInfoSize: 10000,
		maxPeerDiscoveryResponseLength: 1000,
	};
	const nodeInfo = {
		os: 'os',
		version: '1.2.0',
		protocolVersion: '1.2',
		nethash: 'nethash',
		wsPort: 6001,
		height: 100,
	};
	const legacyNodeInfo = nodeInfo
		? sanitizeNodeInfoToLegacyFormat(nodeInfo)
		: undefined;
	const clientOptions = {
		hostname: '12.12.12.12',
		port: 5001,
		query: querystring.stringify({
			...legacyNodeInfo,
			options: JSON.stringify(legacyNodeInfo),
		}),
		connectTimeout: 500,
		ackTimeout: 500,
		multiplex: false,
		autoConnect: false,
		autoReconnect: false,
		maxPayload: DEFAULT_WS_MAX_PAYLOAD,
	};
	let defaultOutboundPeer: OutboundPeer;

	beforeEach(() => {
		defaultOutboundPeer = new OutboundPeer(
			defaultPeerInfo,
			defaultOutboundPeerConfig,
		);
	});

	describe('#constructor', () => {
		it('should be an object', () =>
			expect(defaultOutboundPeer).to.be.an('object'));

		it('should be an instance of P2P blockchain', () =>
			expect(defaultOutboundPeer)
				.to.be.an('object')
				.and.be.instanceof(OutboundPeer));
	});

	describe('#socket', () => {
		it('should unbind handlers from outbound socket if it exists', () => {
			const outboundSocket = socketClusterClient.create(clientOptions);
			sandbox.stub(
				defaultOutboundPeer as any,
				'_unbindHandlersFromOutboundSocket',
			);

			defaultOutboundPeer['_socket'] = outboundSocket;
			expect(defaultOutboundPeer['_socket']).to.eql(outboundSocket);
			defaultOutboundPeer.socket = outboundSocket;
			expect(defaultOutboundPeer['_unbindHandlersFromOutboundSocket']).to.be
				.calledOnce;
		});
		it('should set new socket', () => {
			const outboundSocket = socketClusterClient.create(clientOptions);

			expect(defaultOutboundPeer['_socket']).to.be.empty;
			defaultOutboundPeer.socket = outboundSocket;
			expect(defaultOutboundPeer['_socket']).to.eql(outboundSocket);
		});
		it('should bind handlers to outbound socket', () => {
			const outboundSocket = socketClusterClient.create(clientOptions);
			sandbox.stub(defaultOutboundPeer as any, '_bindHandlersToOutboundSocket');

			defaultOutboundPeer['_socket'] = outboundSocket;
			defaultOutboundPeer.socket = outboundSocket;
			expect(defaultOutboundPeer['_bindHandlersToOutboundSocket']).to.be
				.calledOnce;
		});
	});

	describe('#connect', () => {
		it('should create outbound socket if it does not exist');
		it('should connect');
	});

	describe('#disconnect', () => {
		it('should disconnect');
		it('should unbind handlers from oubound socket if it exists');
	});

	describe('#send', () => {
		it('should create outbound socket if it does not exist');
		it('should send packet');
	});

	describe('#request', () => {
		it('should create outbound socket if it does not exist');
		it('should request packet');
	});
});

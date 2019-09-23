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
import { REMOTE_SC_EVENT_MESSAGE } from '../../../src/events';
import { SCClientSocket } from 'socketcluster-client';

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

	afterEach(() => {
		defaultOutboundPeer.disconnect();
	});

	describe('#constructor', () => {
		it('should be an instance of OutboundPeer class', () =>
			expect(defaultOutboundPeer).to.be.instanceof(OutboundPeer));
	});

	describe('#socket', () => {
		it('should not unbind handlers from outbound socket if it does not exist', () => {
			const outboundSocket = socketClusterClient.create(clientOptions);
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
			const outboundSocket = socketClusterClient.create(clientOptions);
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
			const outboundSocket = socketClusterClient.create(clientOptions);

			expect((defaultOutboundPeer as any)._socket).to.be.undefined;
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._socket).to.eql(outboundSocket);
		});

		it('should bind handlers to outbound socket', () => {
			const outboundSocket = socketClusterClient.create(clientOptions);
			sandbox.stub(defaultOutboundPeer as any, '_bindHandlersToOutboundSocket');

			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.socket = outboundSocket;
			expect((defaultOutboundPeer as any)._bindHandlersToOutboundSocket).to.be
				.calledOnce;
		});
	});

	describe('#connect', () => {
		it('should not create outbound socket if one already exists', () => {
			const outboundSocket = socketClusterClient.create(clientOptions);
			sandbox.stub(defaultOutboundPeer as any, '_createOutboundSocket');

			(defaultOutboundPeer as any)._socket = outboundSocket;
			defaultOutboundPeer.connect();
			expect((defaultOutboundPeer as any)._createOutboundSocket).to.be.not
				.called;
		});

		it('should create outbound socket if it does not exist', () => {
			const outboundSocket = socketClusterClient.create(clientOptions);
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
			const outboundSocket = socketClusterClient.create(clientOptions);
			(defaultOutboundPeer as any)._socket = outboundSocket;
			sandbox.stub((defaultOutboundPeer as any)._socket, 'connect');

			defaultOutboundPeer.connect();
			expect((defaultOutboundPeer as any)._socket['connect']).to.be.calledOnce;
		});
	});

	describe('#disconnect', () => {
		it('should call disconnect and destroy socket', () => {
			const outboundSocket = socketClusterClient.create(clientOptions);
			(defaultOutboundPeer as any)._socket = outboundSocket;
			sandbox.stub((defaultOutboundPeer as any)._socket, 'destroy');
			defaultOutboundPeer.disconnect();
			expect(
				(defaultOutboundPeer as any)._socket['destroy'],
			).to.be.calledOnceWith(1000);
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
			const outboundSocket = socketClusterClient.create(clientOptions);
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
			const outboundSocket = socketClusterClient.create(clientOptions);
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
			const outboundSocket = socketClusterClient.create(clientOptions);
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

		it('should call send and emit event', () => {
			const outboundSocket = socketClusterClient.create(clientOptions);
			const packet = {
				data: 'myData',
				event: 'myEvent',
			};
			(defaultOutboundPeer as any)._socket = outboundSocket;
			sandbox.stub((defaultOutboundPeer as any)._socket, 'emit');

			defaultOutboundPeer.send(packet);
			expect((defaultOutboundPeer as any)._socket['emit']).to.be.calledOnceWith(
				REMOTE_SC_EVENT_MESSAGE,
				packet,
			);
		});
	});

	describe('#request', () => {
		it('should not create an outbound socket if one exists', () => {
			const socket = <SCClientSocket>({
				emit: sandbox.stub(),
				destroy: sandbox.stub(),
				off: sandbox.stub(),
			} as any);
			const packet = {
				data: 'myData',
				procedure: 'myProcedure',
			};
			sandbox.stub(defaultOutboundPeer as any, '_createOutboundSocket');

			(defaultOutboundPeer as any)._socket = socket;
			defaultOutboundPeer.request(packet);
			expect((defaultOutboundPeer as any)._createOutboundSocket).to.be.not
				.called;
		});

		it('should create outbound socket if it does not exist any', () => {
			const socket = <SCClientSocket>({
				emit: sandbox.stub(),
				destroy: sandbox.stub(),
				off: sandbox.stub(),
			} as any);
			const packet = {
				data: 'myData',
				procedure: 'myProcedure',
			};
			sandbox
				.stub(defaultOutboundPeer as any, '_createOutboundSocket')
				.returns(socket);

			expect((defaultOutboundPeer as any)._socket).to.be.undefined;
			defaultOutboundPeer.request(packet);
			expect((defaultOutboundPeer as any)._createOutboundSocket).to.be
				.calledOnce;
			expect((defaultOutboundPeer as any)._socket).to.eql(socket);
		});

		it('should emit event', () => {
			const socket = <SCClientSocket>({
				emit: sandbox.stub(),
				destroy: sandbox.stub(),
				off: sandbox.stub(),
			} as any);
			const packet = {
				data: 'myData',
				procedure: 'myProcedure',
			};
			(defaultOutboundPeer as any)._socket = socket;

			defaultOutboundPeer.request(packet);
			expect(socket.emit).to.be.called;
		});
	});
});

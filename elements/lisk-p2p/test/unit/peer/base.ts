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
import { Peer } from '../../../src/peer';
import { P2PDiscoveredPeerInfo } from '../../../src/p2p_types';
import {
	DEFAULT_REPUTATION_SCORE,
	FORBIDDEN_CONNECTION,
	FORBIDDEN_CONNECTION_REASON,
} from '../../../src/constants';
import { EVENT_BAN_PEER } from '../../../src/events';

describe('peer/base', () => {
	const DEFAULT_RANDOM_SECRET = 123;
	const defaultPeerInfo: P2PDiscoveredPeerInfo = {
		ipAddress: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
		isDiscoveredPeer: true,
		version: '1.1.1',
		protocolVersion: '1.1',
	};
	const peerConfig = {
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
	const p2pDiscoveredPeerInfo = {
		ipAddress: defaultPeerInfo.ipAddress,
		wsPort: defaultPeerInfo.wsPort,
		height: 1000,
		updatedAt: new Date(),
		os: 'MYOS',
		version: '1.3.0',
		protocolVersion: '1.3',
	};
	let defaultPeer: Peer;

	beforeEach(() => {
		defaultPeer = new Peer(defaultPeerInfo, peerConfig);
	});

	afterEach(() => {
		sandbox.restore();
		defaultPeer.disconnect();
	});

	describe('#constructor', () => {
		it('should be an object', () => expect(defaultPeer).to.be.an('object'));

		it('should be an instance of P2P blockchain', () =>
			expect(defaultPeer)
				.to.be.an('object')
				.and.be.instanceof(Peer));
	});

	describe('#height', () =>
		it('should get height property', () =>
			expect(defaultPeer.height)
				.to.be.a('number')
				.and.be.eql(545776)));

	describe('#id', () =>
		it('should get id property', () =>
			expect(defaultPeer.id)
				.to.be.a('string')
				.and.be.eql('12.12.12.12:5001')));

	describe('#ipAddress', () =>
		it('should get ipAddress property', () =>
			expect(defaultPeer.ipAddress)
				.to.be.a('string')
				.and.be.eql('12.12.12.12')));

	describe('#reputation', () =>
		it('should get reputation property', () =>
			expect(defaultPeer.reputation)
				.to.be.a('number')
				.and.be.eql(100)));

	describe('#netgroup', () =>
		it('should get netgroup property', () =>
			expect(defaultPeer.netgroup)
				.to.be.a('number')
				.and.be.eql(3045444456)));

	describe('#latency', () =>
		it('should get latency property', () =>
			expect(defaultPeer.latency)
				.to.be.a('number')
				.and.be.eql(0)));

	describe('#connectTime', () =>
		it('should get connectTime property', () =>
			expect(defaultPeer.connectTime)
				.to.be.a('number')
				.and.be.at.least(0)));

	describe('#responseRate', () =>
		it('should get responseRate property', () =>
			expect(defaultPeer.responseRate)
				.to.be.a('number')
				.and.be.eql(0)));

	describe('#productivity', () =>
		it('should get productivity property', () => {
			const productivity = {
				requestCounter: 0,
				responseCounter: 0,
				responseRate: 0,
				lastResponded: 0,
			};

			expect(defaultPeer.productivity)
				.to.be.an('object')
				.and.be.deep.equal(productivity);
		}));

	describe('#wsMessageRate', () =>
		it('should get wsMessageRate property', () =>
			expect(defaultPeer.wsMessageRate)
				.to.be.a('number')
				.and.be.eql(0)));

	describe('#updatePeerInfo', () =>
		it('should update peer info', () => {
			defaultPeer.updatePeerInfo(p2pDiscoveredPeerInfo);

			expect(defaultPeer.peerInfo)
				.to.be.an('object')
				.and.be.deep.equal(p2pDiscoveredPeerInfo);
		}));

	describe('#peerInfo', () =>
		it('should get peerInfo property', () =>
			expect(defaultPeer.peerInfo)
				.to.be.an('object')
				.and.be.deep.equal(defaultPeerInfo)));

	describe('#applyPenalty', () => {
		describe('when reputation does not go below 0', () => {
			beforeEach(() => {
				sandbox.stub(defaultPeer as any, '_banPeer');
			});

			it('should apply penalty', () => {
				const reputation = defaultPeer.reputation;
				const penalty = DEFAULT_REPUTATION_SCORE / 10;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.reputation).to.be.eql(reputation - penalty);
			});

			it('should not ban peer', () => {
				const penalty = DEFAULT_REPUTATION_SCORE / 10;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer['_banPeer']).to.be.not.called;
			});
		});

		describe('when reputation goes below 0', () => {
			beforeEach(() => {
				sandbox.stub(defaultPeer, 'emit');
				sandbox.stub(defaultPeer, 'disconnect');
			});

			it('should apply penalty', () => {
				const reputation = defaultPeer.reputation;
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.reputation).to.be.eql(reputation - penalty);
			});

			it('should emit EVENT_BAN_PEER', () => {
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.emit).to.be.calledOnceWithExactly(
					EVENT_BAN_PEER,
					defaultPeer.id,
				);
			});

			it('should disconnect peer', () => {
				const penalty = DEFAULT_REPUTATION_SCORE;
				defaultPeer.applyPenalty(penalty);
				expect(defaultPeer.disconnect).to.be.calledOnceWithExactly(
					FORBIDDEN_CONNECTION,
					FORBIDDEN_CONNECTION_REASON,
				);
			});
		});
	});

	describe('#wsPort', () =>
		it('should get wsPort property', () =>
			expect(defaultPeer.wsPort)
				.to.be.a('number')
				.and.be.eql(5001)));

	describe('#state', () =>
		it('should get state property', () =>
			expect(defaultPeer.state)
				.to.be.a('string')
				.and.be.eql('closed')));

	describe('#applyNodeInfo', () => {
		beforeEach(() => {
			sandbox.stub(defaultPeer, 'request').resolves();
		});

		it('should apply node info', async () => {
			await defaultPeer.applyNodeInfo(nodeInfo);

			expect(defaultPeer.nodeInfo)
				.to.be.an('object')
				.and.be.deep.equal(nodeInfo);
		});
	});

	describe('#nodeInfo', () => {
		beforeEach(() => {
			sandbox.stub(defaultPeer, 'request').resolves();
		});

		it('should apply node info', async () => {
			await defaultPeer.applyNodeInfo(nodeInfo);

			expect(defaultPeer.nodeInfo)
				.to.be.an('object')
				.and.be.deep.equal(nodeInfo);
		});
	});

	describe('#connect', () => it('should connect'));

	describe('#disconnect', () => it('should disconnect'));

	describe('#send', () => it('should send'));

	describe('#request', () => it('should request'));

	describe('#fetchPeers', () => it('should fetch peers'));

	describe('#discoverPeers', () => it('should discover peers'));

	describe('#fetchStatus', () => {
		it('should fetch status');
	});
});

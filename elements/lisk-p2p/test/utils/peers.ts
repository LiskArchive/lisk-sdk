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
import {
	ConnectionKind,
	DEFAULT_RANDOM_SECRET,
	DEFAULT_WS_MAX_MESSAGE_RATE,
} from '../../src/constants';
import { Peer } from '../../src/peer';
import { P2PPeerInfo } from '../../src/types';
import { assignInternalInfo } from '../../src/utils';
import { defaultRPCSchemas } from '../../src/schema';

export const initPeerInfoList = (): ReadonlyArray<P2PPeerInfo> => {
	const peerOption1: P2PPeerInfo = {
		peerId: '204.120.0.15:5001',
		ipAddress: '204.120.0.15',
		port: 5001,
		sharedState: {
			networkVersion: '1.1',
			nonce: 'nonce',
			chainID: Buffer.from('10000000', 'hex'),
			options: {
				height: 1,
			},
		},
		internalState: {
			...assignInternalInfo(
				{ peerId: '204.120.0.15:5001', ipAddress: '204.120.0.15', port: 5001 },
				11,
			),
		},
	};

	const peerOption2: P2PPeerInfo = {
		peerId: '204.120.0.16:5002',
		ipAddress: '204.120.0.16',
		port: 5002,
		sharedState: {
			nonce: 'nonce',
			chainID: Buffer.from('10000000', 'hex'),
			networkVersion: '1.1',
			options: {
				height: 1,
			},
		},
		internalState: {
			...assignInternalInfo(
				{ peerId: '204.120.0.15:5001', ipAddress: '204.120.0.15', port: 5001 },
				22,
			),
		},
	};

	const peerOption3: P2PPeerInfo = {
		peerId: '204.120.0.17:5008',
		ipAddress: '204.120.0.17',
		port: 5008,
		sharedState: {
			nonce: 'nonce',
			chainID: Buffer.from('10000000', 'hex'),
			networkVersion: '1.1',
			options: {
				height: 1,
			},
		},
		internalState: {
			...assignInternalInfo(
				{ peerId: '204.120.0.15:5001', ipAddress: '204.120.0.15', port: 5001 },
				33,
			),
		},
	};

	const peerOption4: P2PPeerInfo = {
		peerId: '204.120.0.18:5006',
		ipAddress: '204.120.0.18',
		port: 5006,
		sharedState: {
			nonce: 'nonce',
			chainID: Buffer.from('10000000', 'hex'),
			networkVersion: '1.1',
			options: {
				height: 1,
			},
		},
		internalState: {
			...assignInternalInfo(
				{ peerId: '204.120.0.15:5001', ipAddress: '204.120.0.15', port: 5001 },
				44,
			),
		},
	};

	const peerOption5: P2PPeerInfo = {
		peerId: '204.120.0.19:5001',
		ipAddress: '204.120.0.19',
		port: 5001,
		sharedState: {
			chainID: Buffer.from('10000000', 'hex'),
			nonce: 'nonce',
			networkVersion: '1.1',
			options: {
				height: 1,
			},
		},
		internalState: {
			...assignInternalInfo(
				{ peerId: '204.120.0.15:5001', ipAddress: '204.120.0.15', port: 5001 },
				55,
			),
		},
	};

	return [peerOption1, peerOption2, peerOption3, peerOption4, peerOption5];
};

export const initPeerInfoListWithSuffix = (
	ipSuffix: string,
	qty: number,
): ReadonlyArray<P2PPeerInfo> => {
	const peerInfos = [];
	for (let i = 1; i <= qty; i += 1) {
		peerInfos.push({
			peerId: `${i % 255}.${ipSuffix}:${5000 + (i % 40000)}`,
			ipAddress: `${i % 255}.${ipSuffix}`,
			port: 5000 + (i % 40000),
			sharedState: {
				nonce: 'nonce',
				chainID: Buffer.from('10000000', 'hex'),
				networkVersion: '1.1',
				options: {},
			},
			internalState: {
				...assignInternalInfo(
					{
						peerId: `${i % 255}.${ipSuffix}:${5000 + (i % 40000)}`,
						ipAddress: `${i % 255}.${ipSuffix}`,
						port: 5000 + (i % 40000),
					},
					123456,
				),
				reputation: 10 + i,
				connectionKind: i % 4 === 0 ? ConnectionKind.OUTBOUND : ConnectionKind.INBOUND,
			},
		});
	}

	return peerInfos;
};

export const initPeerList = (): ReadonlyArray<Peer> =>
	initPeerInfoList().map(
		(peerInfo: P2PPeerInfo) =>
			new Peer(peerInfo, {
				hostPort: 5000,
				rateCalculationInterval: 1000,
				wsMaxMessageRate: DEFAULT_WS_MAX_MESSAGE_RATE,
				wsMaxMessageRatePenalty: 10,
				secret: DEFAULT_RANDOM_SECRET,
				maxPeerInfoSize: 10000,
				maxPeerDiscoveryResponseLength: 1000,
				peerStatusMessageRate: 4,
				rpcSchemas: {
					...defaultRPCSchemas,
				},
			}),
	);

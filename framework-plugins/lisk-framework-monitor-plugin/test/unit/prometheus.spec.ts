/*
 * Copyright © 2020 Lisk Foundation
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

import { when } from 'jest-when';
import { Request } from 'express';
import { PeerInfo, SharedState } from '../../src/types';
import { prometheusExport } from '../../src/controllers';

describe('networkStats', () => {
	const connectedPeers: Partial<PeerInfo>[] = [
		{
			ipAddress: '127.0.0.1',
			port: 5001,
			options: { height: 102 },
		},
		{
			ipAddress: '127.0.0.1',
			port: 5002,
			options: { height: 102 },
		},
		{
			ipAddress: '127.0.0.1',
			port: 5003,
			options: { height: 101 },
		},
	];

	const disconnectedPeers: Partial<PeerInfo>[] = [
		{
			ipAddress: '127.0.0.1',
			port: 5004,
			options: { height: 2 },
		},
		{
			ipAddress: '127.0.0.1',
			port: 5005,
			options: { height: 34 },
		},
		{
			ipAddress: '127.0.0.1',
			port: 5006,
			options: { height: 51 },
		},
	];

	const nodeInfo = {
		finalizedHeight: 80,
		height: 102,
		unconfirmedTransactions: 17,
	};

	const channelMock = {
		invoke: jest.fn(),
	};

	const sharedState: SharedState = {
		blocks: {
			averageReceivedBlocks: 6,
			blocks: {},
			connectedPeers: connectedPeers.length,
		},
		transactions: {
			averageReceivedTransactions: 9,
			transactions: {},
			connectedPeers: connectedPeers.length,
		},
		forks: {
			blockHeaders: {},
			forkEventCount: 3,
		},
	};

	const prometheus = prometheusExport.getData(channelMock as any, sharedState);

	const expectedExportData =
		'# HELP Block Propagation\n' +
		'# TYPE avg_times_block_received gauge\n' +
		'avg_times_block_received 6\n\n' +
		'# HELP Transaction Propagation\n' +
		'# TYPE avg_times_transaction_received gauge\n' +
		'avg_times_transaction_received 9\n\n' +
		'# HELP Node Height\n' +
		'# TYPE node_height gauge\n' +
		'node_height 102\n\n' +
		'# HELP Finalized Height\n' +
		'# TYPE finalized_height gauge\n' +
		'finalized_height 80\n\n' +
		'# HELP Unconfirmed transactions\n' +
		'# TYPE unconfirmed_transactions gauge\n' +
		'unconfirmed_transactions 17\n\n' +
		'# HELP Connected peers\n' +
		'# TYPE connected_peers gauge\n' +
		'connected_peers 3\n\n' +
		'# HELP Disconnected peers\n' +
		'# TYPE disconnected_peers gauge\n' +
		'disconnected_peers 3\n\n' +
		'# HELP Fork events\n' +
		'# TYPE fork_events gauge\n' +
		'fork_events 3\n\n';

	beforeEach(() => {
		when(channelMock.invoke)
			.calledWith('app:getConnectedPeers')
			.mockResolvedValue(connectedPeers)
			.calledWith('app:getDisconnectedPeers')
			.mockResolvedValue(disconnectedPeers)
			.calledWith('app:getNodeInfo')
			.mockResolvedValue(nodeInfo);
	});

	it('should return node metrics in prometheus format', async () => {
		// Arrange
		const next = jest.fn();

		const res = {
			status: jest.fn().mockImplementation(_code => res),
			send: jest.fn().mockImplementation(_param => res),
		} as any;

		// Act
		await prometheus({} as Request, res, next);

		// Assert
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.send).toHaveBeenCalledWith(expectedExportData);
	});

	it('should throw error when any channel action fails', async () => {
		// Arrange
		const next = jest.fn();
		const res = {
			status: jest.fn().mockImplementation(_code => res),
			send: jest.fn().mockImplementation(_param => res),
		} as any;

		const error = new Error('Something went wrong');
		channelMock.invoke.mockRejectedValue(error);

		// Act
		await prometheus({} as Request, res, next);

		// Assert
		expect(next).toHaveBeenCalledWith(error);
	});
});

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
import { PeerInfo } from '../../src/types';
import { network as networkController } from '../../src/controllers';

describe('networkStats', () => {
	const peers: Partial<PeerInfo>[] = [
		{ options: { height: 51 } },
		{ options: { height: 52 } },
		{ options: { height: 52 } },
		{ options: { height: 52 } },
		{ options: { height: 49 } },
		{ options: { height: 0 } },
		{ options: { height: 23 } },
		{ options: { height: 23 } },
		{ options: { height: 52 } },
		{ options: { height: 52 } },
		{ options: { height: 55 } },
		{ options: { height: 52 } },
		{ options: { height: 52 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
		{ options: { height: 53 } },
	]; // Majority is of 7 peers with height 52

	const defaultNetworkStats = {
		startTime: Date.now(),
		incoming: {
			count: 0,
			connects: 0,
			disconnects: 0,
		},
		outgoing: {
			count: 0,
			connects: 0,
			disconnects: 0,
		},
		banning: {
			bannedPeers: {},
			totalBannedPeers: 0,
		},
		totalErrors: 0,
		totalPeersDiscovered: 0,
		totalRemovedPeers: 0,
		totalMessagesReceived: {},
		totalRequestsReceived: {},
		majorityHeight: { height: 52, count: 7 },
	};

	const channelMock = {
		invoke: jest.fn(),
	};
	const network = networkController.getNetworkStats(channelMock as any);

	beforeEach(() => {
		when(channelMock.invoke)
			.calledWith('app:getNetworkStats')
			.mockResolvedValue(defaultNetworkStats)
			.calledWith('app:getConnectedPeers')
			.mockResolvedValue(peers);
	});

	it('should add new transactions to state', async () => {
		// Arrange
		const next = jest.fn();

		const res = {
			status: jest.fn().mockImplementation(_code => res),
			json: jest.fn().mockImplementation(_param => res),
		} as any;

		// Act
		await network({} as Request, res, next);

		// Assert
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ data: defaultNetworkStats, meta: {} });
	});

	it('should throw error when any channel action fails', async () => {
		// Arrange
		const next = jest.fn();
		const res = {
			status: jest.fn().mockImplementation(_code => res),
			json: jest.fn().mockImplementation(_param => res),
		} as any;

		const error = new Error('Something went wrong');
		channelMock.invoke.mockRejectedValue(error);

		// Act
		await network({} as Request, res, next);

		// Assert
		expect(next).toHaveBeenCalledWith(error);
	});
});

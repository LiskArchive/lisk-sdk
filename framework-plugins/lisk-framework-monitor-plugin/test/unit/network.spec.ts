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
import { testing } from 'lisk-framework';
import { PeerInfo } from '../../src/types';
import { MonitorPlugin } from '../../src';
import * as config from '../../src/defaults/default_config';

const validPluginOptions = config.defaultConfig.default;

describe('networkStats', () => {
	let monitorPlugin: MonitorPlugin;
	let channelInvokeMock;
	const {
		mocks: { channelMock },
	} = testing;

	const connectedPeers: Partial<PeerInfo>[] = [
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
			count: 0,
		},
		totalErrors: 0,
		totalPeersDiscovered: 0,
		totalRemovedPeers: 0,
		totalMessagesReceived: {},
		totalRequestsReceived: {},
		majorityHeight: { height: 52, count: 7 },
		totalPeers: {
			connected: connectedPeers.length,
			disconnected: disconnectedPeers.length,
		},
	};

	beforeEach(async () => {
		monitorPlugin = new MonitorPlugin(validPluginOptions as never);
		await monitorPlugin.load(channelMock);

		channelInvokeMock = jest.fn();
		channelMock.invoke = channelInvokeMock;
		when(channelInvokeMock)
			.calledWith('app:getNetworkStats')
			.mockResolvedValue(defaultNetworkStats as never)
			.calledWith('app:getConnectedPeers')
			.mockResolvedValue(connectedPeers as never)
			.calledWith('app:getDisconnectedPeers')
			.mockResolvedValue(disconnectedPeers as never);
	});

	it('should add new transactions to state', async () => {
		// Act
		const networkStats = await (monitorPlugin.actions as any).getNetworkStats();
		// Assert
		expect(networkStats).toEqual(defaultNetworkStats);
	});

	it('should throw error when any channel action fails', async () => {
		// Arrange
		const error = new Error('Something went wrong');
		(channelMock.invoke as any).mockRejectedValue(error);

		// Assert
		await expect((monitorPlugin.actions as any).getNetworkStats()).rejects.toThrow(error.message);
	});
});

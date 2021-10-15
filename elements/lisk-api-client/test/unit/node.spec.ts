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
 *
 */

import { Channel } from '../../src/types';
import { Node } from '../../src/node';

describe('node', () => {
	let channel: Channel;
	let node: Node;

	beforeEach(() => {
		channel = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			invoke: jest.fn(),
			subscribe: jest.fn(),
		};
		node = new Node(channel);
	});

	describe('Node', () => {
		describe('constructor', () => {
			it('should initialize with channel', () => {
				expect(node['_channel']).toBe(channel);
			});
		});

		describe('getNodeInfo', () => {
			it('should invoke app_getNodeInfo', async () => {
				// Act
				await node.getNodeInfo();

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app_getNodeInfo');
			});
		});

		describe('getNetworkStats', () => {
			it('should invoke app_getNetworkStats', async () => {
				// Act
				await node.getNetworkStats();

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app_getNetworkStats');
			});
		});

		describe('getConnectedPeers', () => {
			it('should invoke app_getConnectedPeers', async () => {
				// Act
				await node.getConnectedPeers();

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app_getConnectedPeers');
			});
		});

		describe('getDisconnectedPeers', () => {
			it('should invoke app_getDisconnectedPeers', async () => {
				// Act
				await node.getDisconnectedPeers();

				// Assert
				expect(channel.invoke).toHaveBeenCalledTimes(1);
				expect(channel.invoke).toHaveBeenCalledWith('app_getDisconnectedPeers');
			});
		});
	});
});

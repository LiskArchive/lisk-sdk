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
import { when } from 'jest-when';
import { APIClient } from '../src/api_client';
import { Channel } from '../src/types';

describe('APIClient module', () => {
	let client: APIClient;
	let channel: Channel;

	beforeEach(() => {
		channel = {
			connect: jest.fn(),
			disconnect: jest.fn(),
			invoke: jest.fn(),
			subscribe: jest.fn(),
		};
		client = new APIClient(channel);
	});

	describe('when init is called', () => {
		beforeEach(async () => {
			when(channel.invoke as any)
				.calledWith('system_getMetadata')
				.mockResolvedValue({ modules: [] } as never);

			await client.init();
		});

		it('should get the registered schema', () => {
			expect(channel.invoke).toHaveBeenCalledWith('system_getSchema');
		});

		it('should get the metadata', () => {
			expect(channel.invoke).toHaveBeenCalledWith('system_getMetadata');
		});

		it('should get the node info', () => {
			expect(channel.invoke).toHaveBeenCalledWith('system_getNodeInfo');
		});

		it('should create node namespace', () => {
			expect(client.node).toBeDefined();
		});
	});

	describe('when disconnect is called', () => {
		it('should disconnect from the channel', async () => {
			await client.disconnect();
			expect(channel.disconnect).toHaveBeenCalledTimes(1);
		});
	});

	describe('when invoke is called', () => {
		it('should call the invoke of the channel', async () => {
			const param = {
				random: '123',
			};
			await client.invoke('some_action', param);
			expect(channel.invoke).toHaveBeenCalledWith('some_action', param);
		});
	});

	describe('when subscribe is called', () => {
		it('should call subscribe of the channel', () => {
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			const listener = () => {};
			client.subscribe('some_event', listener);

			expect(channel.subscribe).toHaveBeenCalledWith('some_event', listener);
		});
	});
});

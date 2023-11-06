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

import { apiClient } from '../../src';

const { createWSClient } = apiClient;

describe('createWSClient', () => {
	it('should connect to ws server', async () => {
		const client = await createWSClient('ws://localhost:8989/ws');
		expect(client).toBeDefined();

		await client.disconnect();
	});

	it('should disconnect from ws server', async () => {
		const client = await createWSClient('ws://localhost:8989/ws');

		await expect(client.disconnect()).resolves.toBeUndefined();
	});

	describe('invoke', () => {
		it('should able to invoke any action', async () => {
			const client = await createWSClient('ws://localhost:8989/ws');

			const result = await client.invoke('myAction', { prop1: 'prop1' });

			expect(result).toEqual(
				expect.objectContaining({
					jsonrpc: '2.0',
					method: 'myAction',
					id: expect.any(Number),
					params: { prop1: 'prop1' },
				}),
			);

			await client.disconnect();
		});
	});

	describe('subscribe', () => {
		it('should able to subscribe to an event', async () => {
			const client = await createWSClient('ws://localhost:8989/ws');

			await new Promise<void>(resolve => {
				client.subscribe('myEvent', data => {
					expect(data).toEqual({ eventProp: 'eventProp' });
					resolve();
				});
			});

			expect.assertions(1);
			await client.disconnect();
		});
	});
});

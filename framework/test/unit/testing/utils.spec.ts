/*
 * Copyright © 2021 Lisk Foundation
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

import { APIClient } from '@liskhq/lisk-api-client';
import { waitUntilBlockHeight } from '../../../src/testing/utils';

describe('utils', () => {
	describe('waitUntilBlockHeight', () => {
		let apiClient: APIClient;
		beforeEach(() => {
			apiClient = {
				// eslint-disable-next-line @typescript-eslint/require-await
				subscribe: jest.fn(async (_, callback) => callback({ block: 'blockdata' })),
				block: {
					decode: jest.fn().mockReturnValue({ header: { height: 2 } }),
				},
			} as any;
		});

		it('should resolve after input height', async () => {
			await expect(waitUntilBlockHeight({ apiClient, height: 1 })).resolves.toBeUndefined();
		});

		it('should timeout', async () => {
			// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-misused-promises
			apiClient.subscribe = jest.fn(async () => setTimeout(() => undefined, 2));
			await expect(waitUntilBlockHeight({ apiClient, height: 1, timeout: 1 })).rejects.toThrow(
				"'waitUntilBlockHeight' timed out after 1 ms",
			);
		});
	});
});

/*
 * Copyright © 2022 Lisk Foundation
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

import { apiClient } from 'lisk-sdk';
import { Fixtures } from '../../../types';
import { logger, block, account } from '../../../utils';

export const sampleTokenTestScenario = (fixtures: Fixtures) =>
	describe('token module', () => {
		let client: apiClient.APIClient;

		beforeAll(async () => {
			client = await apiClient.createIPCClient(fixtures.dataPath);
		});

		afterAll(async () => {
			await client.disconnect();
		});

		it('transfer token', async () => {
			const target = await account.createAccount();
			const tx = await client.transaction.create(
				{
					module: 'token',
					command: 'transfer',
					fee: '100000000',
					params: {
						amount: '100000000',
						recipientAddress: target.address,
						data: '',
						tokenID: Buffer.alloc(8, 0).toString('hex'),
					},
				},
				fixtures.validators.keys[0].privateKey,
			);
			const { transactionId } = await client.transaction.send(tx);
			logger.log({ ...tx, id: transactionId });
			await block.waitForTransaction(client, transactionId);

			const resp = await client.invoke('token_getBalances', { address: target.address });
			logger.log(resp);

			expect(resp.balances).toHaveLength(1);
		});
	});

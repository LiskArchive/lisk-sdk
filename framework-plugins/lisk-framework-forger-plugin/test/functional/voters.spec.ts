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

import { testing, PartialApplicationConfig } from 'lisk-sdk';
import { waitTill } from '../utils/application';
import { createVoteTransaction } from '../utils/transactions';
import { ForgerPlugin } from '../../src';

describe('forger:getStakers action', () => {
	let appEnv: testing.ApplicationEnv;
	let accountNonce = 0;
	let chainID: Buffer;

	beforeAll(async () => {
		const rootPath = '~/.lisk/forger-plugin';
		const config = {
			rootPath,
			label: 'stakers_functional',
		} as PartialApplicationConfig;

		appEnv = testing.createDefaultApplicationEnv({
			config,
			plugins: [new ForgerPlugin()],
		});
		await appEnv.startApplication();
		// The test application generates a dynamic genesis block so we need to get the networkID like this
		chainID = appEnv.application['_node'].chainID;
	});

	afterAll(async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication();
	});

	describe('action forger:getStakers', () => {
		it('should return valid format', async () => {
			// Arrange & Act
			const stakers = await appEnv.ipcClient.invoke('forger:getStakers');

			// Assert
			expect(stakers).toMatchSnapshot();
			expect(stakers).toBeInstanceOf(Array);
			expect(stakers).toHaveLength(103);
			expect(stakers[0]).toMatchObject(
				expect.objectContaining({
					address: expect.any(String),
					username: expect.any(String),
					totalStakeReceived: expect.any(String),
					stakers: expect.any(Array),
				}),
			);
		});

		it('should return valid stakers', async () => {
			// Arrange
			const initialVoters = await appEnv.ipcClient.invoke('forger:getStakers');
			const forgingDelegateAddress = (initialVoters[0] as any).address;
			const transaction = createVoteTransaction({
				amount: '10',
				recipientAddress: forgingDelegateAddress,
				fee: '0.3',
				nonce: accountNonce,
				chainID,
			});
			accountNonce += 1;

			await appEnv.ipcClient.invoke('txpool_postTransaction', {
				transaction: transaction.getBytes().toString('hex'),
			});
			await appEnv.waitNBlocks(1);
			// Wait a bit to give plugin a time to calculate forger info
			await waitTill(2000);

			// Act
			const stakers = await appEnv.ipcClient.invoke('forger:getStakers');
			const forgerInfo = (stakers as any).find(
				(forger: any) => forger.address === forgingDelegateAddress,
			);

			// Assert
			expect(forgerInfo.stakers[0]).toMatchObject(
				expect.objectContaining({
					address: transaction.senderAddress.toString('hex'),
					amount: '1000000000',
				}),
			);
		});
	});
});

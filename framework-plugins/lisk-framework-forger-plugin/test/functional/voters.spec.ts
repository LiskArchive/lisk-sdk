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

import {
	createApplicationEnv,
	closeApplicationEnv,
	waitNBlocks,
	waitTill,
	ApplicationEnvInterface,
} from '../utils/application';
import { createVoteTransaction } from '../utils/transactions';

describe('forger:getVoters action', () => {
	let appEnv: ApplicationEnvInterface;
	let accountNonce = 0;
	let networkIdentifier: Buffer;

	beforeAll(async () => {
		appEnv = await createApplicationEnv('forger_functional_voters');
		// The test application generates a dynamic genesis block so we need to get the networkID like this
		networkIdentifier = appEnv.application['_node'].networkIdentifier;
	});

	afterAll(async () => {
		await appEnv.apiClient.disconnect();
		await closeApplicationEnv(appEnv);
	});

	describe('action forger:getVoters', () => {
		it('should return valid format', async () => {
			// Arrange & Act
			const voters = await appEnv.apiClient.invoke('forger:getVoters');

			// Assert
			expect(voters).toMatchSnapshot();
			expect(voters).toBeInstanceOf(Array);
			expect(voters).toHaveLength(103);
			expect(voters[0]).toMatchObject(
				expect.objectContaining({
					address: expect.any(String),
					username: expect.any(String),
					totalVotesReceived: expect.any(String),
					voters: expect.any(Array),
				}),
			);
		});

		it('should return valid voters', async () => {
			// Arrange
			const initialVoters = await appEnv.apiClient.invoke('forger:getVoters');
			const forgingDelegateAddress = (initialVoters[0] as any).address;
			const transaction = createVoteTransaction({
				amount: '10',
				recipientAddress: forgingDelegateAddress,
				fee: '0.3',
				nonce: accountNonce,
				networkIdentifier,
			});
			accountNonce += 1;

			await appEnv.application['_channel'].invoke('app:postTransaction', {
				transaction: transaction.getBytes().toString('hex'),
			});
			await waitNBlocks(appEnv.application, 1);
			// Wait a bit to give plugin a time to calculate forger info
			await waitTill(2000);

			// Act
			const voters = await appEnv.apiClient.invoke('forger:getVoters');
			const forgerInfo = (voters as any).find(
				(forger: any) => forger.address === forgingDelegateAddress,
			);

			// Assert
			expect(forgerInfo.voters[0]).toMatchObject(
				expect.objectContaining({
					address: transaction.senderAddress.toString('hex'),
					amount: '1000000000',
				}),
			);
		});
	});
});

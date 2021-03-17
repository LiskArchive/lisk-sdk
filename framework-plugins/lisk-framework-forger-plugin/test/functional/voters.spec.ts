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

import { KeysModule, SequenceModule, testing, TokenModule, DPoSModule } from 'lisk-framework';
import { rmdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { ForgerPlugin } from '../../src';
import { waitTill, config } from '../utils/application';
import { createVoteTransaction } from '../utils/transactions';
import { getGenesisBlockJSON } from '../utils/genesis_block';

describe('forger:getVoters action', () => {
	let appEnv: testing.ApplicationEnv;
	let accountNonce = 0;
	let networkIdentifier: Buffer;
	const appLabel = 'forger-plugin';
	const dataPath = join(homedir(), '.lisk', appLabel);

	beforeAll(async () => {
		if (existsSync(dataPath)) {
			rmdirSync(dataPath, { recursive: true });
		}
		const modules = [TokenModule, SequenceModule, KeysModule, DPoSModule];
		const genesisBlock = getGenesisBlockJSON({
			timestamp: Math.floor(Date.now() / 1000) - 30,
		});
		config.label = 'forger_functional_voters';
		appEnv = new testing.ApplicationEnv({
			modules,
			config,
			plugins: [ForgerPlugin],
			genesisBlock,
		});
		await appEnv.startApplication();
		// The test application generates a dynamic genesis block so we need to get the networkID like this
		networkIdentifier = appEnv.application['_node'].networkIdentifier;
	});

	afterAll(async () => {
		const options: { clearDB: boolean } = { clearDB: true };
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication(options);
	});

	describe('action forger:getVoters', () => {
		it('should return valid format', async () => {
			// Arrange & Act
			const voters = await appEnv.ipcClient.invoke('forger:getVoters');

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
			const initialVoters = await appEnv.ipcClient.invoke('forger:getVoters');
			const forgingDelegateAddress = (initialVoters[0] as any).address;
			const transaction = createVoteTransaction({
				amount: '10',
				recipientAddress: forgingDelegateAddress,
				fee: '0.3',
				nonce: accountNonce,
				networkIdentifier,
			});
			accountNonce += 1;

			await appEnv.ipcClient.invoke('app:postTransaction', {
				transaction: transaction.getBytes().toString('hex'),
			});
			await appEnv.waitNBlocks(1);
			// Wait a bit to give plugin a time to calculate forger info
			await waitTill(2000);

			// Act
			const voters = await appEnv.ipcClient.invoke('forger:getVoters');
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

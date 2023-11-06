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
import { getForgerInfoByAddress, getForgerPlugin, waitTill } from '../../utils/application';
import { getRandomAccount } from '../../utils/accounts';
import { createTransferTransaction, createStakeTransaction } from '../../utils/transactions';
import { ForgerPlugin } from '../../../src';

describe('Forger Info', () => {
	let appEnv: testing.ApplicationEnv;
	let accountNonce = 0;
	let chainID: Buffer;

	beforeAll(async () => {
		const rootPath = '~/.lisk/forger-plugin';
		const config = {
			rootPath,
			label: 'event_track_functional',
		} as PartialApplicationConfig;

		appEnv = testing.createDefaultApplicationEnv({
			config,
			plugins: [new ForgerPlugin()],
		});
		await appEnv.startApplication();
		// The test application generates a dynamic genesis block so we need to get the networkID like this
		chainID = appEnv.chainID;
	});

	afterAll(async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication();
	});

	describe('New Block', () => {
		it('should save forger info after new block', async () => {
			// Arrange
			const forgerPluginInstance = getForgerPlugin(appEnv.application);

			// Act
			const { generatorAddress } = appEnv.lastBlock.header;
			const forgerInfo = await getForgerInfoByAddress(
				forgerPluginInstance,
				generatorAddress.toString('binary'),
			);

			// Assert
			expect(forgerInfo).toMatchSnapshot();
		});

		it('should save forger info with received fees if transactions included in new block', async () => {
			// Arrange
			const forgerPluginInstance = getForgerPlugin(appEnv.application);
			const account = getRandomAccount();
			const transaction = createTransferTransaction({
				amount: '2',
				recipientAddress: account.address,
				fee: '0.3',
				nonce: accountNonce,
				chainID,
			});
			accountNonce += 1;

			await appEnv.ipcClient.invoke('txpool_postTransaction', {
				transaction: transaction.getBytes().toString('hex'),
			});
			await appEnv.waitNBlocks(1);

			const {
				header: { generatorAddress },
			} = appEnv.lastBlock;
			const forgerInfo = await getForgerInfoByAddress(
				forgerPluginInstance,
				generatorAddress.toString('binary'),
			);

			// Assert
			expect(forgerInfo).toMatchSnapshot();
		});

		describe('Stake transactions', () => {
			it('should save forger info with stakes received in new block', async () => {
				// Arrange
				const forgerPluginInstance = getForgerPlugin(appEnv.application);
				const [forgingValidatorAddress] = forgerPluginInstance['_forgersList'].entries()[0];
				const transaction1 = createStakeTransaction({
					amount: '10',
					recipientAddress: forgingValidatorAddress.toString('hex'),
					fee: '0.3',
					nonce: accountNonce,
					chainID,
				});
				accountNonce += 1;

				await appEnv.ipcClient.invoke('txpool_postTransaction', {
					transaction: transaction1.getBytes().toString('hex'),
				});
				await appEnv.waitNBlocks(1);
				await waitTill(200);

				const forgerInfo = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingValidatorAddress.toString('binary'),
				);
				// Assert
				expect(forgerInfo).toMatchSnapshot();
				expect(forgerInfo.stakeReceived[0].amount).toEqual(BigInt(1000000000));
			});

			it('should update forger info with multiple stakes received for same validator in new block', async () => {
				// Arrange
				const forgerPluginInstance = getForgerPlugin(appEnv.application);
				const [forgingValidatorAddress] = forgerPluginInstance['_forgersList'].entries()[0];
				const transaction1 = createStakeTransaction({
					amount: '10',
					recipientAddress: forgingValidatorAddress.toString('hex'),
					fee: '0.3',
					nonce: accountNonce,
					chainID,
				});
				accountNonce += 1;
				const transaction2 = createStakeTransaction({
					amount: '50',
					recipientAddress: forgingValidatorAddress.toString('hex'),
					fee: '0.3',
					nonce: accountNonce,
					chainID,
				});
				accountNonce += 1;

				await appEnv.ipcClient.invoke('txpool_postTransaction', {
					transaction: transaction1.getBytes().toString('hex'),
				});
				await appEnv.ipcClient.invoke('txpool_postTransaction', {
					transaction: transaction2.getBytes().toString('hex'),
				});
				await appEnv.waitNBlocks(1);
				await waitTill(200);

				const forgerInfo = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingValidatorAddress.toString('binary'),
				);
				// Assert
				expect(forgerInfo).toMatchSnapshot();
				expect(forgerInfo.stakeReceived[0].amount).toEqual(BigInt(7000000000));
			});

			it('should update forger info with upvote and downvote for same validator in new block', async () => {
				// Arrange
				const forgerPluginInstance = getForgerPlugin(appEnv.application);
				const [forgingValidatorAddress] = forgerPluginInstance['_forgersList'].entries()[0];
				const transaction1 = createStakeTransaction({
					amount: '-50',
					recipientAddress: forgingValidatorAddress.toString('hex'),
					fee: '0.3',
					nonce: accountNonce,
					chainID,
				});
				accountNonce += 1;
				const transaction2 = createStakeTransaction({
					amount: '+10',
					recipientAddress: forgingValidatorAddress.toString('hex'),
					fee: '0.3',
					nonce: accountNonce,
					chainID,
				});
				accountNonce += 1;

				await appEnv.ipcClient.invoke('txpool_postTransaction', {
					transaction: transaction1.getBytes().toString('hex'),
				});
				await appEnv.ipcClient.invoke('txpool_postTransaction', {
					transaction: transaction2.getBytes().toString('hex'),
				});
				await appEnv.waitNBlocks(1);
				await waitTill(200);

				const forgerInfo = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingValidatorAddress.toString('binary'),
				);
				// Assert
				expect(forgerInfo).toMatchSnapshot();
				expect(forgerInfo.stakeReceived[0].amount).toEqual(BigInt(3000000000));
			});

			it('should update forger info with stakers info and remove when amount becomes zero', async () => {
				// Arrange
				const forgerPluginInstance = getForgerPlugin(appEnv.application);
				const [forgingValidatorAddress1] = forgerPluginInstance['_forgersList'].entries()[0];
				const [forgingValidatorAddress2] = forgerPluginInstance['_forgersList'].entries()[1];
				const transaction1 = createStakeTransaction({
					amount: '-30',
					recipientAddress: forgingValidatorAddress1.toString('hex'),
					fee: '0.3',
					nonce: accountNonce,
					chainID,
				});
				accountNonce += 1;
				const transaction2 = createStakeTransaction({
					amount: '20',
					recipientAddress: forgingValidatorAddress2.toString('hex'),
					fee: '0.3',
					nonce: accountNonce,
					chainID,
				});
				accountNonce += 1;

				await appEnv.ipcClient.invoke('txpool_postTransaction', {
					transaction: transaction1.getBytes().toString('hex'),
				});
				await appEnv.ipcClient.invoke('txpool_postTransaction', {
					transaction: transaction2.getBytes().toString('hex'),
				});
				await appEnv.waitNBlocks(1);
				await waitTill(200);

				const forgerInfo1 = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingValidatorAddress1.toString('binary'),
				);
				const forgerInfo2 = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingValidatorAddress2.toString('binary'),
				);
				// Assert
				expect(forgerInfo1).toMatchSnapshot();
				expect(forgerInfo1.stakeReceived).toBeEmpty();
				expect(forgerInfo2).toMatchSnapshot();
				expect(forgerInfo2.stakeReceived[0].amount).toEqual(BigInt(2000000000));
			});
		});
	});

	describe('Delete Block', () => {
		it('should update forger info after delete block', async () => {
			// Arrange
			const { generatorAddress } = appEnv.lastBlock.header;
			const forgerPluginInstance = getForgerPlugin(appEnv.application);
			await appEnv.application['_node']['_processor'].deleteLastBlock();

			// Act
			await waitTill(50);
			const forgerInfo = await getForgerInfoByAddress(
				forgerPluginInstance,
				generatorAddress.toString('binary'),
			);

			// Asserts
			expect(forgerInfo).toMatchSnapshot();
		});
	});
});

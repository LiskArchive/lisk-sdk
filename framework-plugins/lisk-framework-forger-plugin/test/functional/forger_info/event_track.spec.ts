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

import { Application } from 'lisk-framework';

import {
	closeApplication,
	createApplication,
	getForgerInfoByAddress,
	getForgerInfoByPublicKey,
	waitNBlocks,
	waitTill,
} from '../../utils/application';
import { ForgerPlugin } from '../../../src';
import { getRandomAccount } from '../../utils/accounts';
import { createTransferTransaction, createVoteTransaction } from '../../utils/transactions';

describe('Forger Info', () => {
	let app: Application;
	let accountNonce = 0;

	beforeAll(async () => {
		app = await createApplication('event_track');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('New Block', () => {
		it('should save forger info after new block', async () => {
			// Arrange
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];

			// Act
			const { generatorPublicKey } = app['_node']['_chain'].lastBlock.header;
			const forgerInfo = await getForgerInfoByPublicKey(forgerPluginInstance, generatorPublicKey);

			// Assert
			expect(forgerInfo).toMatchSnapshot();
		});

		it('should save forger info with received fees if payload included in new block', async () => {
			// Arrange
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
			const account = getRandomAccount();
			const transaction = createTransferTransaction({
				amount: '2',
				recipientAddress: account.address,
				fee: '0.3',
				nonce: accountNonce,
			});
			accountNonce += 1;

			await app['_channel'].invoke('app:postTransaction', {
				transaction: transaction.getBytes().toString('base64'),
			});
			await waitNBlocks(app, 1);

			const {
				header: { generatorPublicKey },
			} = app['_node']['_chain'].lastBlock;
			const forgerInfo = await getForgerInfoByPublicKey(forgerPluginInstance, generatorPublicKey);

			// Assert
			expect(forgerInfo).toMatchSnapshot();
		});

		describe('Vote transactions', () => {
			it('should save forger info with votes received in new block', async () => {
				// Arrange
				const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
				const [forgingDelegateAddress] = forgerPluginInstance['_forgersList'].entries()[0];
				const transaction1 = createVoteTransaction({
					amount: '10',
					recipientAddress: forgingDelegateAddress.toString('base64'),
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;

				await app['_channel'].invoke('app:postTransaction', {
					transaction: transaction1.getBytes().toString('base64'),
				});
				await waitNBlocks(app, 1);
				await waitTill(200);

				const forgerInfo = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingDelegateAddress.toString('binary'),
				);
				// Assert
				expect(forgerInfo).toMatchSnapshot();
				expect(forgerInfo.votesReceived[0].amount).toEqual(BigInt(1000000000));
			});

			it('should update forger info with multiple votes received for same delegate in new block', async () => {
				// Arrange
				const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
				const [forgingDelegateAddress] = forgerPluginInstance['_forgersList'].entries()[0];
				const transaction1 = createVoteTransaction({
					amount: '10',
					recipientAddress: forgingDelegateAddress.toString('base64'),
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;
				const transaction2 = createVoteTransaction({
					amount: '50',
					recipientAddress: forgingDelegateAddress.toString('base64'),
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;

				await app['_channel'].invoke('app:postTransaction', {
					transaction: transaction1.getBytes().toString('base64'),
				});
				await app['_channel'].invoke('app:postTransaction', {
					transaction: transaction2.getBytes().toString('base64'),
				});
				await waitNBlocks(app, 1);
				await waitTill(200);

				const forgerInfo = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingDelegateAddress.toString('binary'),
				);
				// Assert
				expect(forgerInfo).toMatchSnapshot();
				expect(forgerInfo.votesReceived[0].amount).toEqual(BigInt(7000000000));
			});

			it('should update forger info with upvote and downvote for same delegate in new block', async () => {
				// Arrange
				const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
				const [forgingDelegateAddress] = forgerPluginInstance['_forgersList'].entries()[0];
				const transaction1 = createVoteTransaction({
					amount: '-50',
					recipientAddress: forgingDelegateAddress.toString('base64'),
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;
				const transaction2 = createVoteTransaction({
					amount: '+10',
					recipientAddress: forgingDelegateAddress.toString('base64'),
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;

				await app['_channel'].invoke('app:postTransaction', {
					transaction: transaction1.getBytes().toString('base64'),
				});
				await app['_channel'].invoke('app:postTransaction', {
					transaction: transaction2.getBytes().toString('base64'),
				});
				await waitNBlocks(app, 1);
				await waitTill(200);

				const forgerInfo = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingDelegateAddress.toString('binary'),
				);
				// Assert
				expect(forgerInfo).toMatchSnapshot();
				expect(forgerInfo.votesReceived[0].amount).toEqual(BigInt(3000000000));
			});

			it('should update forger info with voters info in new block', async () => {
				// Arrange
				const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
				const [forgingDelegateAddress1] = forgerPluginInstance['_forgersList'].entries()[0];
				const [forgingDelegateAddress2] = forgerPluginInstance['_forgersList'].entries()[1];
				const transaction1 = createVoteTransaction({
					amount: '20',
					recipientAddress: forgingDelegateAddress1.toString('base64'),
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;
				const transaction2 = createVoteTransaction({
					amount: '20',
					recipientAddress: forgingDelegateAddress2.toString('base64'),
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;

				await app['_channel'].invoke('app:postTransaction', {
					transaction: transaction1.getBytes().toString('base64'),
				});
				await app['_channel'].invoke('app:postTransaction', {
					transaction: transaction2.getBytes().toString('base64'),
				});
				await waitNBlocks(app, 1);
				await waitTill(200);

				const forgerInfo1 = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingDelegateAddress1.toString('binary'),
				);
				const forgerInfo2 = await getForgerInfoByAddress(
					forgerPluginInstance,
					forgingDelegateAddress2.toString('binary'),
				);
				// Assert
				expect(forgerInfo1).toMatchSnapshot();
				expect(forgerInfo1.votesReceived[0].amount).toEqual(BigInt(5000000000));
				expect(forgerInfo2).toMatchSnapshot();
				expect(forgerInfo2.votesReceived[0].amount).toEqual(BigInt(2000000000));
			});
		});
	});

	describe('Delete Block', () => {
		it('should update forger info after delete block', async () => {
			// Arrange
			const { generatorPublicKey } = app['_node']['_chain'].lastBlock.header;
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
			await app['_node']['_processor'].deleteLastBlock();

			// Act
			await waitTill(50);
			const forgerInfo = await getForgerInfoByPublicKey(forgerPluginInstance, generatorPublicKey);

			// Asserts
			expect(forgerInfo).toMatchSnapshot();
		});
	});
});

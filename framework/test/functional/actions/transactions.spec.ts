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
// TODO: Fix the test when functional test is fixed https://github.com/LiskHQ/lisk-sdk/issues/7209
// import {
// 	createApplication,
// 	closeApplication,
// 	sendTransaction,
// 	waitNBlocks,
// } from '../utils/application';
// import { Application, Transaction } from '../../../src';
// import { genesis, DefaultAccountProps } from '../../fixtures';
// import { nodeUtils } from '../../utils';
// import { createTransferTransaction } from '../../utils/mocks/transaction';

// describe('Transaction related actions', () => {
// 	let app: Application;
// 	let sentTx: Transaction;

// 	beforeAll(async () => {
// 		app = await createApplication('actions-transactions');
// 		sentTx = await sendTransaction(app);
// 		await waitNBlocks(app, 1);
// 	});

// 	afterAll(async () => {
// 		await closeApplication(app);
// 	});

// 	describe('getTransactionsFromPool', () => {
// 		it('should return valid encoded encodedTransactions', async () => {
// 			const encodedTransactions = await app['_channel'].invoke('app_getTransactionsFromPool');
// 			expect(encodedTransactions).toHaveLength(0);
// 		});
// 	});

// 	describe('postTransaction', () => {
// 		it('should successfully post valid transaction', async () => {
// 			const genesisAccount = await app['_node'][
// 				'_chain'
// 			].dataAccess.getAccountByAddress<DefaultAccountProps>(genesis.address);
// 			const accountWithoutBalance = nodeUtils.createAccount();
// 			const fundingTx = createTransferTransaction({
// 				nonce: genesisAccount.sequence.nonce,
// 				fee: BigInt('200000'),
// 				recipientAddress: accountWithoutBalance.address,
// 				amount: BigInt('10000000000'),
// 				chainID: app['_node']['_chainID'],
// 				privateKey: Buffer.from(genesis.privateKey, 'hex'),
// 			});

// 			await expect(
// 				app['_channel'].invoke('txpool_postTransaction', {
// 					transaction: fundingTx.getBytes().toString('hex'),
// 				}),
// 			).resolves.toEqual({ transactionId: fundingTx.id.toString('hex') });
// 		});
// 	});

// 	describe('getTransactionByID', () => {
// 		it('should return valid encoded transaction', async () => {
// 			const encodedTx = await app['_channel'].invoke('app_getTransactionByID', {
// 				id: sentTx.id.toString('hex'),
// 			});
// 			expect(encodedTx).toBeString();
// 			const tx = app['_node']['_chain'].dataAccess.decodeTransaction(
// 				Buffer.from(encodedTx as string, 'hex'),
// 			);
// 			expect(tx.senderPublicKey).toEqual(sentTx.senderPublicKey);
// 		});
// 	});

// 	describe('getTransactionsByIDs', () => {
// 		it('should return valid encoded transactions', async () => {
// 			const encodedTxs: string[] = await app['_channel'].invoke('app_getTransactionsByIDs', {
// 				ids: [sentTx.id.toString('hex')],
// 			});
// 			expect(encodedTxs).toHaveLength(1);
// 			const tx = app['_node']['_chain'].dataAccess.decodeTransaction(
// 				Buffer.from(encodedTxs[0], 'hex'),
// 			);
// 			expect(tx.senderPublicKey).toEqual(sentTx.senderPublicKey);
// 		});
// 	});
// });

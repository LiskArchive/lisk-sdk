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

import { TransferTransaction } from '@liskhq/lisk-transactions';
import {
	createApplication,
	closeApplication,
	sendTransaction,
	waitNBlocks,
} from '../../utils/application';
import { Application } from '../../../../src';
import { genesis } from '../../../fixtures';
import { nodeUtils } from '../../../utils';

describe('Transaction related actions', () => {
	let app: Application;
	let sentTx: TransferTransaction;

	beforeAll(async () => {
		app = await createApplication('actions-transactions');
		sentTx = await sendTransaction(app);
		await waitNBlocks(app, 1);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('getTransactionsFromPool', () => {
		it('should return valid encoded encodedTransactions', async () => {
			const encodedTransactions = await app['_channel'].invoke('app:getTransactionsFromPool');
			expect(encodedTransactions).toHaveLength(0);
		});
	});

	describe('postTransaction', () => {
		it('should successfully post valid transaction', async () => {
			const genesisAccount = await app['_node']['_chain'].dataAccess.getAccountByAddress(
				genesis.address,
			);
			const accountWithoutBalance = nodeUtils.createAccount();
			const fundingTx = new TransferTransaction({
				nonce: genesisAccount.nonce,
				senderPublicKey: genesis.publicKey,
				fee: BigInt('200000'),
				asset: {
					recipientAddress: accountWithoutBalance.address,
					amount: BigInt('10000000000'),
					data: '',
				},
			});
			fundingTx.sign(app['_node']['_networkIdentifier'], genesis.passphrase);

			await expect(
				app['_channel'].invoke('app:postTransaction', {
					transaction: fundingTx.getBytes().toString('base64'),
				}),
			).resolves.toEqual({ transactionId: fundingTx.id.toString('base64') });
		});
	});

	describe('getTransactionByID', () => {
		it('should return valid encoded transaction', async () => {
			const encodedTx = await app['_channel'].invoke('app:getTransactionByID', {
				id: sentTx.id.toString('base64'),
			});
			expect(encodedTx).toBeString();
			const tx = app['_node']['_chain'].dataAccess.decodeTransaction(
				Buffer.from(encodedTx as string, 'base64'),
			);
			expect(tx.senderPublicKey).toEqual(sentTx.senderPublicKey);
		});
	});

	describe('getTransactionsByIDs', () => {
		it('should return valid encoded transactions', async () => {
			const encodedTxs: string[] = await app['_channel'].invoke('app:getTransactionsByIDs', {
				ids: [sentTx.id.toString('base64')],
			});
			expect(encodedTxs).toHaveLength(1);
			const tx = app['_node']['_chain'].dataAccess.decodeTransaction(
				Buffer.from(encodedTxs[0], 'base64'),
			);
			expect(tx.senderPublicKey).toEqual(sentTx.senderPublicKey);
		});
	});
});

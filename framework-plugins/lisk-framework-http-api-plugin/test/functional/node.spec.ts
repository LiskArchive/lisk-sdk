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
import axios from 'axios';
import {
	callNetwork,
	createApplication,
	closeApplication,
	getURL,
	waitNBlocks,
} from './utils/application';
import { getRandomAccount } from './utils/accounts';
import { createTransferTransaction } from './utils/transactions';

describe('Node Info endpoint', () => {
	let app: Application;
	let accountNonce = 0;

	beforeAll(async () => {
		app = await createApplication('node_http_functional');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('api/node/info', () => {
		it('should respond node info', async () => {
			const appInstance = app as any;
			const nodeStatusAndConstantFixture = {
				version: appInstance._node._options.version,
				networkVersion: appInstance._node._options.networkVersion,
				networkID: appInstance._node._options.networkId,
				lastBlockID: appInstance._node._chain.lastBlock.header.id.toString('base64'),
				height: appInstance._node._chain.lastBlock.header.height,
				finalizedHeight: appInstance._node._bft.finalityManager.finalizedHeight,
				syncing: appInstance._node._synchronizer.isActive,
				unconfirmedTransactions: appInstance._node._transactionPool.getAll().length,
				genesisConfig: {
					...appInstance._node._options.genesisConfig,
					...appInstance._node._options.constants,
					totalAmount: appInstance._node._options.constants.totalAmount.toString(),
				},
			};

			const result = await axios.get(getURL('/api/node/info'));

			expect(result.data).toEqual({ data: nodeStatusAndConstantFixture });
			expect(result.status).toBe(200);
		});
	});

	describe('GET /api/node/transactions/', () => {
		describe('200 - Success', () => {
			let account: any;

			beforeEach(() => {
				account = getRandomAccount();
			});

			afterEach(async () => {
				await waitNBlocks(app, 2);
			});

			it('should be ok with no transactions in pool', async () => {
				// Act
				const { response, status } = await callNetwork(axios.get(getURL('/api/node/transactions')));

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({ data: [], meta: { limit: 10, offset: 0, total: 0 } });
			});

			it('should be ok with transactions in pool', async () => {
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: 0,
				});
				accountNonce += 1;
				const { id: txID, ...input } = transaction;
				await axios.post(getURL('/api/transactions'), input);

				// Act
				const { response, status } = await callNetwork(axios.get(getURL('/api/node/transactions')));

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({ data: [transaction], meta: { limit: 10, offset: 0, total: 1 } });
			});

			it('should be ok with limit', async () => {
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;
				const { id: txID, ...input1 } = transaction;
				await axios.post(getURL('/api/transactions'), input1);
				const transaction2 = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;

				const { id, ...input2 } = transaction2;
				await axios.post(getURL('/api/transactions'), input2);

				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/node/transactions/?limit=1')),
				);

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({ data: [transaction], meta: { limit: 1, offset: 0, total: 2 } });
			});

			it('should be ok with offset', async () => {
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;
				const { id: txID, ...input1 } = transaction;
				await axios.post(getURL('/api/transactions'), input1);
				const transaction2 = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: 5,
				});

				const { id, ...input2 } = transaction2;
				await axios.post(getURL('/api/transactions'), input2);

				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/node/transactions/?offset=1')),
				);

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({
					data: [transaction2],
					meta: { limit: 10, offset: 1, total: 2 },
				});
			});
		});

		describe('400 - Malformed query or parameters', () => {
			it('should fail if limit is not a number', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/node/transactions/?limit=a')),
				);

				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [{ message: 'The limit query parameter should be a number.' }],
				});
			});

			it('should fail if offset is not a number', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/node/transactions/?offset=a')),
				);

				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [{ message: 'The offset query parameter should be a number.' }],
				});
			});
		});
	});
});

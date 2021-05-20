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
import { testing, PartialApplicationConfig } from 'lisk-framework';
import axios from 'axios';
import { callNetwork, getURL } from './utils/application';
import { createTransferTransaction } from './utils/transactions';
import { HTTPAPIPlugin } from '../../src/http_api_plugin';

describe('Node', () => {
	let appEnv: testing.ApplicationEnv;
	const label = 'node_http_functional';

	beforeAll(async () => {
		const rootPath = '~/.lisk/http-plugin';
		const config = {
			rootPath,
			label,
		} as PartialApplicationConfig;

		appEnv = testing.createDefaultApplicationEnv({
			config,
			plugins: [HTTPAPIPlugin],
		});
		await appEnv.startApplication();
	});

	afterAll(async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication();
	});

	describe('api/node/info', () => {
		it('should respond node info', async () => {
			const appInstance = appEnv.application as any;
			const nodeStatusAndConstantFixture = {
				version: appInstance._node._options.version,
				networkVersion: appInstance._node._options.networkVersion,
				networkIdentifier: appInstance._node.networkIdentifier.toString('hex'),
				lastBlockID: appInstance._node._chain.lastBlock.header.id.toString('hex'),
				height: appInstance._node._chain.lastBlock.header.height,
				finalizedHeight: appInstance._node._bft.finalityManager.finalizedHeight,
				syncing: appInstance._node._synchronizer.isActive,
				unconfirmedTransactions: appInstance._node._transactionPool.getAll().length,
				genesisConfig: appInstance._node._options.genesisConfig,
				registeredModules: expect.any(Array),
				network: {
					port: appInstance._node._options.network.port,
					hostIp: appInstance._node._options.network.hostIp,
					seedPeers: appInstance._node._options.network.seedPeers,
					blacklistedIPs: appInstance._node._options.network.blacklistedIPs,
					fixedPeers: appInstance._node._options.network.fixedPeers,
					whitelistedPeers: appInstance._node._options.network.whitelistedPeers,
				},
			};

			const result = await axios.get(getURL('/api/node/info'));

			expect(result.data).toEqual({ data: nodeStatusAndConstantFixture, meta: {} });
			expect(result.status).toBe(200);
		});
	});

	describe('GET /api/node/transactions/', () => {
		describe('No transactions in pool', () => {
			it('should be ok with no transactions in pool', async () => {
				// Act
				const { response, status } = await callNetwork(axios.get(getURL('/api/node/transactions')));

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({ data: [], meta: { limit: 10, offset: 0, total: 0 } });
			});
		});

		describe('Transactions in pool', () => {
			let account: any;
			let transaction1: any;
			let transaction2: any;

			beforeAll(async () => {
				account = testing.fixtures.createDefaultAccount();
				transaction1 = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: 100,
					networkIdentifier: appEnv.networkIdentifier,
				});
				const { id: txID1, ...input1 } = transaction1;
				await axios.post(getURL('/api/transactions'), input1);

				transaction2 = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: 200,
					networkIdentifier: appEnv.networkIdentifier,
				});
				const { id: txID2, ...input2 } = transaction2;
				await axios.post(getURL('/api/transactions'), input2);
			});

			it('should be ok with transactions in pool', async () => {
				// Act
				const { response, status } = await callNetwork(axios.get(getURL('/api/node/transactions')));

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({
					data: [transaction1, transaction2],
					meta: { limit: 10, offset: 0, total: 2 },
				});
			});

			it('should be ok with limit', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/node/transactions/?limit=1')),
				);

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({ data: [transaction1], meta: { limit: 1, offset: 0, total: 2 } });
			});

			it('should be ok with offset', async () => {
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

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
import { callNetwork, createApplication, closeApplication, getURL } from './utils/application';

describe('Delegates endpoint', () => {
	let app: Application;
	const firstDelegateAccount = {
		address: 'A/bZC329BJfcOlLRwn4ju4x1iX8=',
		balance: '0',
		nonce: '0',
		keys: { numberOfSignatures: 0, mandatoryKeys: [], optionalKeys: [] },
		asset: {
			delegate: {
				username: 'genesis_34',
				pomHeights: [],
				consecutiveMissedBlocks: 0,
				lastForgedHeight: 0,
				isBanned: false,
				totalVotesReceived: '1000000000000',
			},
			sentVotes: [
				{
					delegateAddress: 'A/bZC329BJfcOlLRwn4ju4x1iX8=',
					amount: '1000000000000',
				},
			],
			unlocking: [],
		},
	};

	beforeAll(async () => {
		app = await createApplication('delegates_http_functional');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('/api/delegates', () => {
		describe('200 - Success', () => {
			it('should respond with all the delegates', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/delegates?limit=100')),
				);
				// Assert
				expect(response.data).toHaveLength(100);
				expect(response.data[0]).toEqual(firstDelegateAccount);
				expect(response.meta).toEqual({
					count: 103,
					limit: 100,
					offset: 0,
				});
				expect(status).toBe(200);
			});

			it('should respond with all the delegates after first 100 delegates', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/delegates?limit=100&offset=100')),
				);
				// Assert
				expect(response.data).toHaveLength(3);
				expect(response.meta).toEqual({
					count: 103,
					limit: 100,
					offset: 100,
				});
				expect(status).toBe(200);
			});

			it('should respond with blank array when no delegates are found', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/delegates?limit=100&offset=103')),
				);
				// Assert
				expect(response.data).toHaveLength(0);
				expect(response.data).toEqual([]);
				expect(response.meta).toEqual({
					count: 103,
					limit: 100,
					offset: 103,
				});
				expect(status).toBe(200);
			});
		});

		describe('400 - Invalid query values', () => {
			it('should respond with 400 and error message when limit value is invalid', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/delegates?limit=xxx')),
				);
				// Assert
				expect(status).toBe(400);
				expect(response).toEqual({
					errors: [
						{
							message:
								'Lisk validator found 1 error[s]:\nProperty \'.limit\' should match format "uint32"',
						},
					],
				});
			});

			it('should respond with 400 and error message when offset value is invalid', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/delegates?offset=xxx')),
				);
				// Assert
				expect(status).toBe(400);
				expect(response).toEqual({
					errors: [
						{
							message:
								'Lisk validator found 1 error[s]:\nProperty \'.offset\' should match format "uint32"',
						},
					],
				});
			});
		});
	});
});

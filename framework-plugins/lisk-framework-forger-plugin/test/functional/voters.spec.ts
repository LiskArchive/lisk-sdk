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
	createApplication,
	closeApplication,
	getURL,
	callNetwork,
	waitNBlocks,
	waitTill,
} from '../utils/application';
import { createVoteTransaction } from '../utils/transactions';

describe('Voters endpoint', () => {
	let app: Application;
	let accountNonce = 0;

	beforeAll(async () => {
		app = await createApplication('forger_functional_voters');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('GET /api/voters/', () => {
		describe('200', () => {
			it('should return valid response', async () => {
				// Arrange & Act
				const { response, status } = await callNetwork(axios.get(getURL('/api/voters')));

				// Assert
				expect(status).toEqual(200);
				expect(response).toMatchSnapshot();
			});

			it('should return valid format', async () => {
				// Arrange & Act
				const { response, status } = await callNetwork(axios.get(getURL('/api/voters')));
				const forgerInfo = response.data[0];

				// Assert
				expect(status).toEqual(200);
				expect(response).toHaveProperty('data');
				expect(response).toHaveProperty('meta');
				expect(response.data).toBeInstanceOf(Array);
				expect(forgerInfo).toMatchObject(
					expect.objectContaining({
						address: expect.any(String),
						username: expect.any(String),
						totalVotesReceived: expect.any(String),
						voters: expect.any(Array),
					}),
				);
			});

			// TODO: Enable after fixing https://github.com/LiskHQ/lisk-sdk/issues/5574
			// eslint-disable-next-line jest/no-disabled-tests
			it.skip('should return valid voters', async () => {
				// Arrange
				const { response: delegateResponse } = await callNetwork(axios.get(getURL('/api/voters')));
				const forgingDelegateAddress = delegateResponse.data[0].address;
				const transaction = createVoteTransaction({
					amount: '10',
					recipientAddress: forgingDelegateAddress,
					fee: '0.3',
					nonce: accountNonce,
				});
				accountNonce += 1;
				await app['_channel'].invoke('app:postTransaction', {
					transaction: transaction.getBytes().toString('base64'),
				});
				await waitNBlocks(app, 103);
				// Wait a bit to give plugin a time to calculate forger info
				await waitTill(2000);

				// Act
				const { response, status } = await callNetwork(axios.get(getURL('/api/voters')));
				const forgerInfo = response.data.find(
					(forger: any) => forger.address === forgingDelegateAddress,
				);

				// Assert
				expect(status).toEqual(200);
				expect(forgerInfo.voters[0]).toMatchObject(
					expect.objectContaining({
						address: forgingDelegateAddress,
						amount: '10',
					}),
				);
			});
		});
	});
});

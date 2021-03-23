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
import { testing } from 'lisk-framework';
import axios from 'axios';
import {
	callNetwork,
	createApplicationEnv,
	closeApplicationEnv,
	getURL,
} from './utils/application';

describe('Delegates endpoint', () => {
	let appEnv: testing.ApplicationEnv;

	beforeAll(async () => {
		appEnv = createApplicationEnv('delegates_http_functional');
		await appEnv.startApplication();
	});

	afterAll(async () => {
		await closeApplicationEnv(appEnv);
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
				expect(response.data[0]).toMatchSnapshot();
				expect(response.meta).toEqual({
					count: 104,
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
				expect(response.data).toHaveLength(4);
				expect(response.meta).toEqual({
					count: 104,
					limit: 100,
					offset: 100,
				});
				expect(status).toBe(200);
			});

			it('should respond with blank array when no delegates are found', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/delegates?limit=100&offset=104')),
				);
				// Assert
				expect(response.data).toHaveLength(0);
				expect(response.data).toEqual([]);
				expect(response.meta).toEqual({
					count: 104,
					limit: 100,
					offset: 104,
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

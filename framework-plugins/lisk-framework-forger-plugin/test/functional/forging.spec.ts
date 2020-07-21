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
	waitNBlocks,
	getURL,
	callNetwork,
} from '../utils/application';

describe('api/forging', () => {
	const sampleForgerInfo = {
		address: 'CQP0xctZmnkorvJ+MU6YKR0eOIg=',
		forging: true,
		totalProducedBlocks: 0,
		votesReceived: [],
		totalReceivedFees: '0',
		totalReceivedRewards: '0',
	};
	const sampleForgerPassword = 'elephant tree paris dragon chair galaxy';

	let app: Application;

	beforeAll(async () => {
		app = await createApplication('forging');
		await waitNBlocks(app, 1);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('/api/forging', () => {
		describe('200 - Success', () => {
			it('should respond with forging status and info and disable forging when param forging=false', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: false,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({
					meta: { count: 1 },
					data: { ...sampleForgerInfo, forging: false },
				});
			});

			it('should respond with forging status and info and enable forging when param forging=true', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: true,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({ meta: { count: 1 }, data: sampleForgerInfo });
			});
		});
		describe('400 - Invalid param values', () => {
			it('should respond with 400 and error message when address is not base64 format', async () => {
				// Arrange
				const forgerParams = {
					address: '12345689-xxx',
					password: sampleForgerPassword,
					forging: true,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [{ message: 'The Address parameter should be a base64 string.' }],
				});
			});

			it('should respond with 400 and error message when param password is a number', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: 11111,
					forging: true,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [
						{
							message:
								"Lisk validator found 1 error[s]:\nProperty '.password' should be of type 'string'",
						},
					],
				});
			});

			it('should respond with 400 and error message when param forging is a number', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: 1,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [
						{
							message:
								"Lisk validator found 1 error[s]:\nProperty '.forging' should be of type 'boolean'",
						},
					],
				});
			});
		});
	});
});

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
		address: '0903f4c5cb599a7928aef27e314e98291d1e3888',
		forging: true,
		totalProducedBlocks: 0,
		votesReceived: [],
		totalReceivedFees: '0',
		totalReceivedRewards: '0',
		maxHeightPreviouslyForged: 100,
		maxHeightPrevoted: 10,
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
			it('should enable forging when force is false and maxHeightPreviouslyForged match', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: true,
					maxHeightPreviouslyForged: 0,
					maxHeightPrevoted: 0,
					overwrite: false,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({
					meta: { count: 1 },
					data: {
						...sampleForgerInfo,
						maxHeightPreviouslyForged: 0,
						maxHeightPrevoted: 0,
						forging: true,
					},
				});
			});

			it('should overwrite the maxHeightPreviouslyForged to the input value and enable forging when force is true', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: false,
					maxHeightPreviouslyForged: 100,
					maxHeightPrevoted: 10,
					overwrite: false,
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

			it('should respond with forging status and info and disable forging when param forging=false', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: false,
					maxHeightPreviouslyForged: 100,
					maxHeightPrevoted: 10,
					overwrite: true,
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
					maxHeightPreviouslyForged: 100,
					maxHeightPrevoted: 10,
					overwrite: true,
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
			it('should fail to enable forging when force is false and maxHeightPreviouslyForged does not match', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: true,
					maxHeightPreviouslyForged: 300,
					overwrite: false,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(500);
				expect(response).toEqual({
					errors: [
						{
							message:
								'Failed to enable forging due to contradicting maxHeightPreviouslyForged, actual: 300, expected: 100',
						},
					],
				});
			});

			it('should fail to enable forging when force=false, maxHeightPreviouslyForged!=0 and forger info does not exists', async () => {
				// Arrange
				const { data: forgingInfo } = await axios.get(getURL('/api/forging/info'));
				const delegate = forgingInfo.data.filter(
					(info: { maxHeightPreviouslyForged: number }) => !info.maxHeightPreviouslyForged,
				);
				const forgerParams = {
					address: delegate[0].address,
					password: sampleForgerPassword,
					forging: true,
					maxHeightPreviouslyForged: 999,
					overwrite: false,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(500);
				expect(response).toEqual({
					errors: [
						{
							message:
								'Failed to enable forging due to missing forger info and specifying invalid maxHeightPreviouslyForged: 999',
						},
					],
				});
			});

			it('should respond with 400 and error message when address is not hex format', async () => {
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
					errors: [{ message: 'The address parameter should be a hex string.' }],
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

			it('should respond with 400 and error message when param maxHeightPreviouslyForged is not specified', async () => {
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
				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [
						{
							message:
								'The maxHeightPreviouslyForged parameter must be specified and greater than or equal to 0.',
						},
					],
				});
			});

			it('should respond with 400 and error message when param maxHeightPreviouslyForged is less than 0', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: true,
					maxHeightPreviouslyForged: -1,
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
								'The maxHeightPreviouslyForged parameter must be specified and greater than or equal to 0.',
						},
					],
				});
			});
		});
	});
});

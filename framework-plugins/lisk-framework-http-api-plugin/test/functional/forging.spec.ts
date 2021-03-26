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
import { getURL, callNetwork } from './utils/application';
import { HTTPAPIPlugin } from '../../src/http_api_plugin';

describe('api/forging', () => {
	const sampleForgerInfo = {
		address: '0903f4c5cb599a7928aef27e314e98291d1e3888',
		forging: true,
		height: 1,
		maxHeightPreviouslyForged: 100,
		maxHeightPrevoted: 10,
	};
	const sampleForgerPassword = 'elephant tree paris dragon chair galaxy';

	let appEnv: testing.ApplicationEnv;
	const label = 'forging_http_functional';

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
		await appEnv.waitNBlocks(2);
		const { data } = await axios.get(getURL('/api/forging/info'));
		const forgedDelegateInfo = data.data.filter(
			(forger: { maxHeightPreviouslyForged: number }) => forger.maxHeightPreviouslyForged >= 0,
		);
		sampleForgerInfo.address = forgedDelegateInfo[0].address;
		sampleForgerInfo.maxHeightPreviouslyForged = forgedDelegateInfo[0].maxHeightPreviouslyForged;
		sampleForgerInfo.maxHeightPrevoted = forgedDelegateInfo[0].maxHeightPrevoted;
	});

	afterAll(async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication();
	});

	describe('/api/forging', () => {
		describe('200 - Success', () => {
			it('should overwrite the maxHeightPreviouslyForged to the input value and enable forging when overwrite is true', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: true,
					height: 1,
					maxHeightPreviouslyForged: 0,
					maxHeightPrevoted: 0,
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
					data: { ...sampleForgerInfo, forging: true },
				});
			});

			it('should respond with forging status and info and disable forging when param forging=false', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: false,
					height: 1,
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
					data: { ...sampleForgerInfo, forging: false },
				});
			});

			it('should respond with forging status and info and enable forging when param forging=true', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: true,
					height: 1,
					maxHeightPreviouslyForged: 0,
					maxHeightPrevoted: 0,
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
			it('should fail to enable forging when node is not synced with network', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: true,
					height: 200,
					maxHeightPreviouslyForged: 200,
					maxHeightPrevoted: 10,
					overwrite: true,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(500);
				expect(response.errors).toHaveLength(1);
				expect(response.errors[0].message).toEqual(
					'Failed to enable forging as the node is not synced to the network.',
				);
			});

			it('should fail to enable forging when overwrite is false and maxHeightPreviouslyForged does not match', async () => {
				// Arrange
				const forgerParams = {
					address: sampleForgerInfo.address,
					password: sampleForgerPassword,
					forging: true,
					height: 0,
					maxHeightPreviouslyForged: 300,
					maxHeightPrevoted: 60,
					overwrite: false,
				};

				// Act
				const { response, status } = await callNetwork(
					axios.patch(getURL('/api/forging'), forgerParams),
				);

				// Assert
				expect(status).toEqual(500);
				expect(response.errors).toHaveLength(1);
				expect(response.errors[0].message).toEqual(
					'Failed to enable forging as the node is not synced to the network.',
				);
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
								'The maxHeightPreviouslyForged, maxHeightPrevoted, height parameter must be specified and greater than or equal to 0.',
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
								'The maxHeightPreviouslyForged, maxHeightPrevoted, height parameter must be specified and greater than or equal to 0.',
						},
					],
				});
			});
		});
	});
});

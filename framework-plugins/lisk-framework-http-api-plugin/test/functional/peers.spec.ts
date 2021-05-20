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
import { when } from 'jest-when';

import { HTTPAPIPlugin } from '../../src/http_api_plugin';
import { getURL, callNetwork } from './utils/application';

describe('Peers endpoint', () => {
	let appEnv: testing.ApplicationEnv;
	const label = 'peers_http_functional';

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

	describe('/api/peers', () => {
		describe('400 - Invalid query values', () => {
			it('should respond with 400 and error message when passed incorrect limit value', async () => {
				const { response, status } = await callNetwork(axios.get(getURL('/api/peers?limit=123xy')));
				// Assert
				expect(status).toBe(400);
				expect(response).toEqual({
					errors: [
						{
							message:
								'Lisk validator found 1 error[s]:\nProperty \'.limit\' must match format "uint32"',
						},
					],
				});
			});

			it('should respond with 400 and error message when passed incorrect offset value', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/peers?offset=123xy')),
				);
				// Assert
				expect(status).toBe(400);
				expect(response).toEqual({
					errors: [
						{
							message:
								'Lisk validator found 1 error[s]:\nProperty \'.offset\' must match format "uint32"',
						},
					],
				});
			});
		});

		describe('500 - Some internal operation fails to process', () => {
			it('should throw 500 error when channel.invoke fails', async () => {
				// Arrange
				appEnv.application['_controller']['_inMemoryPlugins']['httpApi'][
					'plugin'
				]._channel.invoke = jest.fn();
				// Mock channel invoke only when app:getConnectedPeers is called
				when(
					appEnv.application['_controller']['_inMemoryPlugins']['httpApi']['plugin']._channel
						.invoke,
				)
					.calledWith('app:getConnectedPeers')
					.mockRejectedValue(new Error('test') as never);
				const { response, status } = await callNetwork(axios.get(getURL('/api/peers')));
				// Assert
				expect(status).toBe(500);
				expect(response.errors).toHaveLength(1);
				expect(response.errors[0].message).toEqual('test');
			});
		});
	});
});

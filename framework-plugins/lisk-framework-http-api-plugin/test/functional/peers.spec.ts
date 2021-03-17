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
import { KeysModule, SequenceModule, TokenModule, testing } from 'lisk-framework';
import axios from 'axios';
import { when } from 'jest-when';
import { HTTPAPIPlugin } from '../../src';
import * as genesisBlock from './fixtures/genesis_block.json';
import { callNetwork, getURL, config } from './utils/application';

describe('Peers endpoint', () => {
	let appEnv: testing.ApplicationEnv;

	beforeAll(async () => {
		config.label = 'peers';
		appEnv = new testing.ApplicationEnv({
			modules: [TokenModule, SequenceModule, KeysModule],
			config,
			plugins: [HTTPAPIPlugin],
			genesisBlock,
		});
		await appEnv.startApplication();
	});

	afterAll(async () => {
		const options: { clearDB: boolean } = { clearDB: true };
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication(options);
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
								'Lisk validator found 1 error[s]:\nProperty \'.limit\' should match format "uint32"',
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
								'Lisk validator found 1 error[s]:\nProperty \'.offset\' should match format "uint32"',
						},
					],
				});
			});
		});

		describe('500 - Some internal operation fails to process', () => {
			it('should throw 500 error when channel.invoke fails', async () => {
				// Arrange
				appEnv.application['_channel'].invoke = jest.fn();
				// Mock channel invoke only when app:getConnectedPeers is called
				when(appEnv.application['_channel'].invoke)
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

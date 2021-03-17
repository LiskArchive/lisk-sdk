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
import { HTTPAPIPlugin } from '../../src';
import * as genesisBlock from './fixtures/genesis_block.json';
import { callNetwork, getURL, config } from './utils/application';

describe('Forging info endpoint', () => {
	let appEnv: testing.ApplicationEnv;
	let forgingStatusData: any;

	beforeAll(async () => {
		config.label = 'forging_info_http_functional';
		appEnv = new testing.ApplicationEnv({
			modules: [TokenModule, SequenceModule, KeysModule],
			config,
			plugins: [HTTPAPIPlugin],
			genesisBlock,
		});
		await appEnv.startApplication();
		forgingStatusData = await appEnv.ipcClient.invoke('app:getForgingStatus');
	});

	afterAll(async () => {
		const options: { clearDB: boolean } = { clearDB: true };
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication(options);
	});

	describe('/api/forging/info', () => {
		describe('200 - Success', () => {
			it('should respond with all the forgers info', async () => {
				// Act
				const { response, status } = await callNetwork(axios.get(getURL('/api/forging/info')));
				// Assert
				expect(response.data).toHaveLength(103);
				expect(response.data).toEqual(forgingStatusData);
				expect(response.meta).toEqual({
					count: 103,
				});
				expect(status).toBe(200);
			});
		});
	});
});

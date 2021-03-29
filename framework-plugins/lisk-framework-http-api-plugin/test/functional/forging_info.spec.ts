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
import { HTTPAPIPlugin } from '../../src/http_api_plugin';

describe('Forging info endpoint', () => {
	let appEnv: testing.ApplicationEnv;
	let forgingStatusData: any;
	const label = 'forging_info_http_functional';

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
		forgingStatusData = await appEnv.ipcClient.invoke('app:getForgingStatus');
	});

	afterAll(async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication();
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

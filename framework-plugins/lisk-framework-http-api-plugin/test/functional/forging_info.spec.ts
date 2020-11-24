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

describe('Forging info endpoint', () => {
	let app: Application;
	let forgingStatusData: any;

	beforeAll(async () => {
		app = await createApplication('forging_info_http_functional');
		forgingStatusData = await app['_channel'].invoke('app:getForgingStatus');
	});

	afterAll(async () => {
		await closeApplication(app);
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

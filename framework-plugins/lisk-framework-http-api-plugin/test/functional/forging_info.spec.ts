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

describe('Forging info endpoint', () => {
	let appEnv: testing.ApplicationEnv;
	let forgingStatusData: any;

	beforeAll(async () => {
		appEnv = createApplicationEnv('forging_info_http_functional');
		await appEnv.startApplication();
		forgingStatusData = await appEnv.application['_channel'].invoke('app:getForgingStatus');
	});

	afterAll(async () => {
		await closeApplicationEnv(appEnv);
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

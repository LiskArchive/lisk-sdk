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

describe('Account endpoint', () => {
	let appEnv: testing.ApplicationEnv;
	const label = 'account_http_functional';

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

	describe('/api/accounts', () => {
		it('should respond with account when account found in db', async () => {
			const result = await axios.get(
				getURL('/api/accounts/9d0149b0962d44bfc08a9f64d5afceb6281d7fb5'),
			);
			expect(result.data).toMatchSnapshot();
			expect(result.status).toBe(200);
		});

		it('should respond with 404 and error message when account not found in db', async () => {
			const { response, status } = await callNetwork(
				axios.get(getURL('/api/accounts/9d0149b0962d44bfc08a9d24d5afceb6281d7fb5')),
			);

			expect(status).toBe(404);
			expect(response).toEqual({
				errors: [
					{
						message:
							"Account with address '9d0149b0962d44bfc08a9d24d5afceb6281d7fb5' was not found",
					},
				],
			});
		});

		it('should respond with 400 and error message when address param is not hex', async () => {
			const { response, status } = await callNetwork(axios.get(getURL('/api/accounts/-nein-no')));

			expect(status).toBe(400);
			expect(response).toEqual({
				errors: [{ message: 'The Address parameter should be a hex string.' }],
			});
		});
	});
});

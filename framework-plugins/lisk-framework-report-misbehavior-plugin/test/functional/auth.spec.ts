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
import axios, { AxiosResponse } from 'axios';
import {
	createApplication,
	closeApplication,
	waitNBlocks,
	getURL,
	getReportMisbehaviorPlugin,
} from '../utils/application';
import { defaultAccount } from '../fixtures/devnet';

describe('Auth', () => {
	let app: Application;

	beforeAll(async () => {
		app = await createApplication('auth');
		await waitNBlocks(app, 1);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('/api/auth', () => {
		describe('200 - Success', () => {
			it('should disable the reporting when enable=false', async () => {
				const { data, status } = await axios.patch(getURL('/api/auth'), {
					password: defaultAccount.password,
					enable: false,
				});
				expect(status).toEqual(200);
				expect(data.data.message).toContain('Successfully disabled the reporting of misbehavior.');
			});

			it('should enable the reporting when enable=true', async () => {
				const { data, status } = await axios.patch(getURL('/api/auth'), {
					password: defaultAccount.password,
					enable: true,
				});
				expect(status).toEqual(200);
				expect(data.data.message).toContain('Successfully enabled the reporting of misbehavior.');
			});
		});

		describe('400 - Fail', () => {
			beforeEach(() => {
				const plugin = getReportMisbehaviorPlugin(app);
				(plugin['_options'] as any).encryptedPassphrase = defaultAccount.encryptedPassphrase;
			});

			it('should fail when encrypted passphrase is not set', async () => {
				let res: AxiosResponse | undefined;
				const plugin = getReportMisbehaviorPlugin(app);
				(plugin['_options'] as any).encryptedPassphrase = '';
				try {
					await axios.patch(getURL('/api/auth'), {
						password: defaultAccount.password,
						enable: false,
					});
				} catch (error) {
					// expected error
					res = error.response;
				}
				expect(res?.status).toEqual(400);
				expect(res?.data).toHaveProperty('errors');
				expect(res?.data.errors[0].message).toEqual(
					'Encrypted passphrase is not set in the config.',
				);
			});

			it('should fail when encrypted passphrase does not match with password given', async () => {
				let res: AxiosResponse | undefined;
				try {
					await axios.patch(getURL('/api/auth'), { password: 'random password', enable: false });
				} catch (error) {
					// expected error
					res = error.response;
				}
				expect(res?.status).toEqual(400);
				expect(res?.data).toHaveProperty('errors');
				expect(res?.data.errors[0].message).toEqual(
					'Unsupported state or unable to authenticate data',
				);
			});
		});
	});
});

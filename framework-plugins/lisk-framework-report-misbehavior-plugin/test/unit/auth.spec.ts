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

import { ApplicationConfigForPlugin, testing } from 'lisk-sdk';
import { ReportMisbehaviorPlugin } from '../../src';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};

const validPluginOptions = {
	...configSchema.default,
	encryptedPrivateKey:
		'kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=35ab87e625765cb46a2fa07c46321f79451587fb22407b535c3ce3d395ce955892e41c93cec994c9292d471b383f5fdee8a33d5e5d685bf2d9e3a88e93ea9117b6cf1feed9d87e8ca31dea6ae7bf28139ce6fa688b3cda97adf892a0b4e2b9b6d46ac26b2f3874f740c102ad4cc75f0ff3ddc2d09fab24ed3c0ae7f0cc16f10a&mac=56e406e2a3e79c518f697c9a7652abd1b6e40f4ae64471050981d109a95b64b0&salt=c56842e8189a53b26517fb284075c77e&iv=593b08e0ae2239e57e1fba51&tag=a04e2e1617581eb95fb17cc14877202c&iterations=1&parallelism=4&memorySize=2024',
	dataPath: '/my/app',
};

describe('auth action', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;

	beforeEach(async () => {
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin();
		await reportMisbehaviorPlugin.init({
			config: {
				...validPluginOptions,
			},
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
	});

	it('should disable the reporting when enable=false', async () => {
		const params = {
			enable: false,
			password: 'testpassword',
		};
		const response = await reportMisbehaviorPlugin.endpoint.authorize({ params } as any);

		expect(response.result).toContain('Successfully disabled the reporting of misbehavior.');
	});

	it('should enable the reporting when enable=true', async () => {
		const params = {
			enable: true,
			password: 'testpassword',
		};
		const response = await reportMisbehaviorPlugin.endpoint.authorize({ params } as any);

		expect(response.result).toContain('Successfully enabled the reporting of misbehavior.');
	});

	it('should fail when encrypted passphrase does not match with password given', async () => {
		const params = {
			enable: true,
			password: '1234',
		};

		await expect(reportMisbehaviorPlugin.endpoint.authorize({ params } as any)).rejects.toThrow(
			'Password given is not valid.',
		);
	});
});

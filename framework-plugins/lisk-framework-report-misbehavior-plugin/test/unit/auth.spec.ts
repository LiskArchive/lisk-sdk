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

import { Types, testing } from 'lisk-sdk';
import { ReportMisbehaviorPlugin } from '../../src';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: Types.ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};

const validPluginOptions = {
	...configSchema.default,
	encryptedPrivateKey:
		'kdf=argon2id&cipher=aes-128-gcm&version=1&ciphertext=6b90c4f36e5c198d6dc1a7e0f64f7524a2fc14fce8fb80165a9434de079a1dcbf8058ee9d369d2afbf26d64f9bc8954efb68a970d97af93a1a40ffe2d354244c9d8472007c618296a3d97e2a059e96f1b5b8004fd0aa254ac7615ade76ea4f2b0ecf0b13b7dcf8c78116e1770fc21aa5e0affcc00c8fd90795eea5c7bc29f597&mac=03cbf0d0695a937161e69c99744499414b52d56854087d8bc84971d2375bb59e&salt=184bc3eabc3ffbcb&iv=88aa7f136a044f09503348373c4b3efd&tag=a331b74e4e6fed55568966d572c4a525&iterations=1&parallelism=4&memorySize=2097023',
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
			password: '123',
		};
		const response = await reportMisbehaviorPlugin.endpoint.authorize({ params } as any);

		expect(response.result).toContain('Successfully disabled the reporting of misbehavior.');
	});

	it('should enable the reporting when enable=true', async () => {
		const params = {
			enable: true,
			password: '123',
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

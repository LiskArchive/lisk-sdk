/*
 * Copyright © 2021 Lisk Foundation
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

import { testing, PartialApplicationConfig, BasePlugin } from 'lisk-sdk';
import { FaucetPlugin } from '../../src';

describe('faucet plugin', () => {
	let appEnv: testing.ApplicationEnv;

	beforeAll(async () => {
		const rootPath = '~/.lisk/faucet-plugin';
		const config = {
			rootPath,
			label: 'faucet_functional',
			plugins: {
				faucet: {
					encryptedPassphrase:
						'iterations=12&cipherText=1f06671e13c0329aee057fee995e08a516bdacd287c7ff2714a74be6099713c87bbc3e005c63d4d3d02f8ba89b42810a5854444ad2b76855007a0925fafa7d870875beb010&iv=3a583b21bbac609c7df3e7e0&salt=245c6859a96339a7735a6cac78ccf625&tag=63653f1d4e8d422a42d98b25d3844792&version=1',
					captchaSecretkey: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
					captchaSitekey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
				},
			},
		} as PartialApplicationConfig;

		appEnv = testing.createDefaultApplicationEnv({
			config,
			plugins: [new FaucetPlugin() as BasePlugin<any>],
		});
		await appEnv.startApplication();
	});

	afterAll(async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication();
	});

	it('should enable faucet', async () => {
		// Arrange
		const authorizeResult = await appEnv.ipcClient.invoke<{ result: string }>('faucet:authorize', {
			enable: true,
			password: 'myTotal53cr3t%&',
		});

		// Assert
		expect(authorizeResult.result).toBe('Successfully enabled the faucet.');
	});

	// *Note*: From backend side, `fundTokens` endpoint cannot be tested without UI token
});

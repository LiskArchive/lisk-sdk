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
import * as axios from 'axios';
import { testing, Types, Plugins } from 'lisk-sdk';
import { FaucetPlugin } from '../../src/plugin';

describe('fund tokens action', () => {
	let appEnv: testing.ApplicationEnv;

	beforeAll(async () => {
		const rootPath = '~/.lisk/faucet';
		const config = {
			rootPath,
			label: 'faucet-integration-tests',
			plugins: {
				faucet: {
					encryptedPassphrase:
						'iterations=10&cipherText=6541c04d7a46eacd666c07fbf030fef32c5db324466e3422e59818317ac5d15cfffb80c5f1e2589eaa6da4f8d611a94cba92eee86722fc0a4015a37cff43a5a699601121fbfec11ea022&iv=141edfe6da3a9917a42004be&salt=f523bba8316c45246c6ffa848b806188&tag=4ffb5c753d4a1dc96364c4a54865521a&version=1',
					captchaSecretkey: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
					captchaSitekey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
				},
			},
		} as Types.PartialApplicationConfig;
		appEnv = testing.createDefaultApplicationEnv({
			config,
			plugins: [new FaucetPlugin() as Plugins.BasePlugin<any>],
		});
		await appEnv.startApplication();
		await appEnv.ipcClient.invoke<{ result: string }>('faucet:authorize', {
			enable: true,
			password: 'elephant tree paris dragon chair galaxy',
		});
	});

	afterAll(async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
		await appEnv.stopApplication();
	});

	it('should fund tokens when captcha success', async () => {
		// Arrange
		jest.spyOn(axios, 'default').mockReturnValue({ data: { success: true } } as any);
		const fundResponse = await appEnv.ipcClient.invoke<{ result: string }>('faucet:fundTokens', {
			address: '92ec9f11d90008ff5b419dedf95417b8f34644e9',
			token: 'valid_captcha_token',
		});

		// Assert
		expect(fundResponse.result).toContain('Successfully funded account at address:');
	});

	it('should fail when captcha invalid', async () => {
		// Arrange
		jest.spyOn(axios, 'default').mockReturnValue({ data: { success: false } } as any);

		// Act & Assert
		await expect(
			appEnv.ipcClient.invoke<{ result: string }>('faucet:fundTokens', {
				address: '92ec9f11d90008ff5b419dedf95417b8f34644e9',
				token: 'invalid_captcha_token',
			}),
		).rejects.toThrow('Captcha response was invalid.');
	});
});

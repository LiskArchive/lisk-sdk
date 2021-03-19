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

import { FaucetPlugin } from '../../../src/plugin';
import { config } from '../../../src/plugin/defaults';

const validPluginOptions = {
	...config.default,
	captchaSitekey: '123',
	captchaSecretkey: '123',
	encryptedPassphrase:
		'salt=683425ca06c9ff88a5ab292bb5066dc5&cipherText=4ce151&iv=bfaeef79a466e370e210f3c6&tag=e84bf097b1ec5ae428dd7ed3b4cce522&version=1',
	dataPath: '/my/app',
};

describe('auth action', () => {
	let faucetPlugin: FaucetPlugin;
	let authorizeAction: any;

	beforeEach(() => {
		faucetPlugin = new FaucetPlugin(validPluginOptions as never);
		(faucetPlugin as any)._options = {
			encryptedPassphrase:
				'iterations=1000000&cipherText=a31a3324ce12664a396329&iv=b476ef9d377397f4f9b0c1ae&salt=d81787ca5103be883a01d211746b1c3f&tag=e352880bb05a03bafc98af48b924fbf9&version=1',
		};
		authorizeAction = faucetPlugin.actions.authorize;
	});

	it('should disable faucet when enable=false', () => {
		const params = {
			enable: false,
			password: '123',
		};
		const response = authorizeAction(params);

		expect(response.result).toContain('Successfully disabled the faucet.');
	});

	it('should enable the faucet when enable=true', () => {
		const params = {
			enable: true,
			password: '123',
		};
		const response = authorizeAction(params);

		expect(response.result).toContain('Successfully enabled the faucet.');
	});

	it('should fail when encrypted passphrase is not set', () => {
		(faucetPlugin as any)._options.encryptedPassphrase = undefined;
		const params = {
			enable: true,
			password: '123',
		};

		expect(() => authorizeAction(params)).toThrow(
			'Encrypted passphrase string must be set in the config.',
		);
	});

	it('should fail when encrypted passphrase does not match with password given', () => {
		const params = {
			enable: true,
			password: '1234',
		};

		expect(() => authorizeAction(params)).toThrow('Password given is not valid.');
	});
});

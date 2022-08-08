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
import {
	BasePluginEndpoint,
	PluginEndpointContext,
	validator as liskValidator,
	cryptography,
} from 'lisk-sdk';
import { actionParamsSchema } from './schemas';
import { ReportMisbehaviorPluginConfig, State } from './types';

// disabled for type annotation
// eslint-disable-next-line prefer-destructuring
const validator: liskValidator.LiskValidator = liskValidator.validator;

const { encrypt, legacy } = cryptography;

export class Endpoint extends BasePluginEndpoint {
	private _state!: State;
	private _config!: ReportMisbehaviorPluginConfig;

	public init(state: State, config: ReportMisbehaviorPluginConfig) {
		this._state = state;
		this._config = config;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async authorize(context: PluginEndpointContext): Promise<{ result: string }> {
		validator.validate(actionParamsSchema, context.params);

		const { enable, password } = context.params;

		try {
			const parsedEncryptedPassphrase = encrypt.parseEncryptedMessage(
				this._config.encryptedPassphrase,
			);

			const passphrase = await encrypt.decryptMessageWithPassword(
				parsedEncryptedPassphrase as any,
				password as string,
				'utf-8',
			);

			const { publicKey } = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);

			this._state.publicKey = enable ? publicKey : undefined;
			this._state.passphrase = enable ? passphrase : undefined;
			const changedState = enable ? 'enabled' : 'disabled';

			return {
				result: `Successfully ${changedState} the reporting of misbehavior.`,
			};
		} catch (error) {
			throw new Error('Password given is not valid.');
		}
	}
}

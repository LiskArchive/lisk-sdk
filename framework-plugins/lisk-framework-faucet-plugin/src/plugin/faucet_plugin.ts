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
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
	getAddressAndPublicKeyFromPassphrase,
} from '@liskhq/lisk-cryptography';
import {
	ActionsDefinition,
	BasePlugin,
	BaseChannel,
	EventsDefinition,
	PluginInfo,
} from 'lisk-framework';
import { objects } from '@liskhq/lisk-utils';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';

import * as config from './defaults';
import { Options, State } from './types';
// eslint-disable-next-line
const packageJSON = require('../../package.json');

const actionParamsSchema = {
	$id: 'lisk/faucet/auth',
	type: 'object',
	required: ['password', 'enable'],
	properties: {
		password: {
			type: 'string',
		},
		enable: {
			type: 'boolean',
		},
	},
};

export class FaucetPlugin extends BasePlugin {
	private _channel!: BaseChannel;
	private _options!: Options;
	private readonly _state!: State;

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get alias(): string {
		return 'faucet';
	}

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get info(): PluginInfo {
		return {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			author: packageJSON.author,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			version: packageJSON.version,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			name: packageJSON.name,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	public get defaults(): Record<string, unknown> {
		return config.defaultConfig;
	}

	// eslint-disable-next-line class-methods-use-this
	public get events(): EventsDefinition {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	public get actions(): ActionsDefinition {
		return {
			authorize: (params?: Record<string, unknown>): { result: string } => {
				const errors = validator.validate(actionParamsSchema, params as Record<string, unknown>);

				if (errors.length) {
					throw new LiskValidationError([...errors]);
				}

				if (
					!this._options.encryptedPassphrase ||
					typeof this._options.encryptedPassphrase !== 'string'
				) {
					throw new Error('Encrypted passphrase string must be set in the config.');
				}

				const { enable, password } = params as Record<string, unknown>;

				try {
					const parsedEncryptedPassphrase = parseEncryptedPassphrase(
						this._options.encryptedPassphrase,
					);

					const passphrase = decryptPassphraseWithPassword(
						parsedEncryptedPassphrase,
						password as string,
					);

					const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);

					this._state.publicKey = enable ? publicKey : undefined;
					this._state.passphrase = enable ? passphrase : undefined;
					const changedState = enable ? 'enabled' : 'disabled';

					return {
						result: `Successfully ${changedState} authorization to distribute tokens from faucet account.`,
					};
				} catch (error) {
					throw new Error('Password given is not valid.');
				}
			},
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(channel: BaseChannel): Promise<void> {
		this._channel = channel;
		this._options = objects.mergeDeep({}, config.defaultConfig.default, this.options) as Options;
	}

	// eslint-disable-next-line @typescript-eslint/require-await, class-methods-use-this, @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {}
}

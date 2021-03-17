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

import { APIClient, createClient } from '@liskhq/lisk-api-client';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import {
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
	getAddressAndPublicKeyFromPassphrase,
} from '@liskhq/lisk-cryptography';
import { objects } from '@liskhq/lisk-utils';
import {
	ActionsDefinition,
	BasePlugin,
	BaseChannel,
	EventsDefinition,
	PluginInfo,
	SchemaWithDefault,
} from 'lisk-framework';
import * as express from 'express';
import { join } from 'path';
import { Server } from 'http';
import { writeFileSync } from 'fs';
import * as defaults from './defaults';
import { FaucetPluginOptions, State } from './types';

// eslint-disable-next-line
const packageJSON = require('../../package.json');

const authorizeParamsSchema = {
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

const fundParamsSchema = {
	$id: 'lisk/faucet/fund',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'hex',
		},
	},
};

export class FaucetPlugin extends BasePlugin {
	private _options!: FaucetPluginOptions;
	private _channel!: BaseChannel;
	private _client!: APIClient;
	private _server!: Server;
	private readonly _state: State = { publicKey: undefined, passphrase: undefined };

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
	public get defaults(): SchemaWithDefault {
		return defaults.config;
	}

	// eslint-disable-next-line class-methods-use-this
	public get events(): EventsDefinition {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	public get actions(): ActionsDefinition {
		return {
			authorize: (params?: Record<string, unknown>): { result: string } => {
				const errors = validator.validate(authorizeParamsSchema, params as Record<string, unknown>);

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
						result: `Successfully ${changedState} the faucet.`,
					};
				} catch (error) {
					throw new Error('Password given is not valid.');
				}
			},
			fundTokens: async (params?: Record<string, unknown>): Promise<{ result: string }> => {
				const errors = validator.validate(fundParamsSchema, params as Record<string, unknown>);

				if (errors.length) {
					throw new LiskValidationError([...errors]);
				}

				if (!this._state.publicKey || !this._state.passphrase) {
					throw new Error('Faucet is not enabled.');
				}

				const { address } = params as Record<string, unknown>;
				await this._transferFunds(address as string);

				return {
					result: `Successfully funded account at address: ${address as string}.`,
				};
			},
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await, class-methods-use-this
	public async load(channel: BaseChannel): Promise<void> {
		this._channel = channel;
		// TODO: Channel type should be fixed. See issue #6246
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this._client = await createClient((this._channel as unknown) as any);
		this._options = objects.mergeDeep(
			{},
			defaults.config.default,
			this._options,
		) as FaucetPluginOptions;

		const config = {
			applicationUrl: this._options.applicationUrl,
			amount: (BigInt(this._options.amount) / BigInt(10 ** 8)).toString(),
			tokenPrefix: this._options.tokenPrefix,
			captcha: this._options.captcha,
			logoURL: this._options.logoURL,
		};
		// Write config file for faucet
		writeFileSync(
			join(__dirname, '../../build', 'config.js'),
			`window.FAUCET_CONFIG = ${JSON.stringify(config)}`,
		);
		const app = express();
		app.use(express.static(join(__dirname, '../../build')));
		this._server = app.listen(3333, 'localhost');
	}

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {
		await new Promise((resolve, reject) => {
			this._server.close(err => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}

	private async _transferFunds(address: string): Promise<void> {
		const transferTransactionAsset = {
			amount: BigInt(this._options.amount),
			recipientAddress: Buffer.from(address, 'hex'),
			data: '',
		};

		const transaction = await this._client.transaction.create(
			{
				moduleID: 2,
				assetID: 0,
				senderPublicKey: this._state.publicKey as Buffer,
				fee: BigInt(this._options.fee), // TODO: The static fee should be replaced by fee estimation calculation
				asset: transferTransactionAsset,
			},
			this._state.passphrase as string,
		);

		await this._client.transaction.send(transaction);
	}
}

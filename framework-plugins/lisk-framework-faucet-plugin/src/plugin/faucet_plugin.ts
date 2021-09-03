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
import { convertLSKToBeddows } from '@liskhq/lisk-transactions';
import {
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
	getAddressAndPublicKeyFromPassphrase,
	getLisk32AddressFromPublicKey,
} from '@liskhq/lisk-cryptography';
import axios from 'axios';
import { ActionsDefinition, BasePlugin, BaseChannel } from 'lisk-framework';
import * as express from 'express';
import { join } from 'path';
import { Server } from 'http';
import { configSchema, authorizeParamsSchema, fundParamsSchema } from './schemas';
import { FaucetPluginConfig, State } from './types';

export class FaucetPlugin extends BasePlugin<FaucetPluginConfig> {
	public name = 'faucet';
	public configSchema = configSchema;

	private _channel!: BaseChannel;
	private _client!: APIClient;
	private _server!: Server;
	private readonly _state: State = { publicKey: undefined, passphrase: undefined };

	public get nodeModulePath(): string {
		return __filename;
	}

	public get actions(): ActionsDefinition {
		return {
			authorize: (params?: Record<string, unknown>): { result: string } => {
				const errors = validator.validate(authorizeParamsSchema, params as Record<string, unknown>);

				if (errors.length) {
					throw new LiskValidationError([...errors]);
				}

				const { enable, password } = params as Record<string, unknown>;

				try {
					const parsedEncryptedPassphrase = parseEncryptedPassphrase(
						this.config.encryptedPassphrase,
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
				const { address, token } = params as Record<string, unknown>;

				if (errors.length) {
					throw new LiskValidationError([...errors]);
				}

				if (!this._state.publicKey || !this._state.passphrase) {
					throw new Error('Faucet is not enabled.');
				}

				const captchaResult = await axios({
					method: 'post',
					url: 'https://www.google.com/recaptcha/api/siteverify',
					params: {
						secret: this.config.captchaSecretkey,
						response: token,
					},
				});

				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (!captchaResult?.data?.success) {
					throw new Error('Captcha response was invalid.');
				}

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
		this._client = await createClient(this._channel);

		const app = express();
		app.get('/api/config', (_req, res) => {
			const config = {
				applicationUrl: this.config.applicationUrl,
				amount: this.config.amount,
				tokenPrefix: this.config.tokenPrefix,
				captchaSitekey: this.config.captchaSitekey,
				logoURL: this.config.logoURL,
				faucetAddress: this._state.publicKey
					? getLisk32AddressFromPublicKey(this._state.publicKey)
					: undefined,
			};
			res.json(config);
		});
		app.use(express.static(join(__dirname, '../../build')));
		this._server = app.listen(this.config.port, this.config.host);
	}

	public async unload(): Promise<void> {
		return new Promise((resolve, reject) => {
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
			amount: BigInt(convertLSKToBeddows(this.config.amount)),
			recipientAddress: Buffer.from(address, 'hex'),
			data: '',
		};

		const transaction = await this._client.transaction.create(
			{
				moduleID: 2,
				assetID: 0,
				senderPublicKey: this._state.publicKey as Buffer,
				fee: BigInt(convertLSKToBeddows(this.config.fee)), // TODO: The static fee should be replaced by fee estimation calculation
				asset: transferTransactionAsset,
			},
			this._state.passphrase as string,
		);

		await this._client.transaction.send(transaction);
	}
}

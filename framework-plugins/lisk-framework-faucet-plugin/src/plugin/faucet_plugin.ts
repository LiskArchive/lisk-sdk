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

import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import {
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
	getAddressAndPublicKeyFromPassphrase,
	signData,
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
				const encodedTransaction = await this._createTransferTransaction(address as string);
				await this._channel.invoke<{
					transactionId?: string;
				}>('app:postTransaction', {
					transaction: encodedTransaction,
				});

				return {
					result: `Successfully funded account at address: ${address as string}.`,
				};
			},
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await, class-methods-use-this
	public async load(channel: BaseChannel): Promise<void> {
		this._channel = channel;
		this._options = objects.mergeDeep(
			{},
			defaults.config.default,
			this._options,
		) as FaucetPluginOptions;
	}

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {}

	private async _createTransferTransaction(address: string): Promise<string> {
		// ModuleID: 2 (Token), AssetID:0 (TransferAsset)
		const transferAssetInfo = this.schemas.transactionsAssets.find(
			({ moduleID, assetID }) => moduleID === 2 && assetID === 0,
		);

		if (!transferAssetInfo) {
			throw new Error('Transfer asset schema is not registered in the application.');
		}

		const encodedAccount = await this._channel.invoke<string>('app:getAccount', {
			address,
		});

		const {
			sequence: { nonce },
		} = codec.decode<{ sequence: { nonce: bigint } }>(
			this.schemas.account,
			Buffer.from(encodedAccount, 'hex'),
		);

		const transferTransactionAsset = {
			amount: BigInt(this._options.amount),
			recipientAddress: Buffer.from(address, 'hex'),
			data: '',
		};

		const { networkIdentifier } = await this._channel.invoke<{ networkIdentifier: string }>(
			'app:getNodeInfo',
		);

		const encodedAsset = codec.encode(transferAssetInfo.schema, transferTransactionAsset);

		const tx = new Transaction({
			moduleID: transferAssetInfo.moduleID,
			assetID: transferAssetInfo.assetID,
			nonce,
			senderPublicKey: this._state.publicKey as Buffer,
			fee: BigInt(this._options.fee), // TODO: The static fee should be replaced by fee estimation calculation
			asset: encodedAsset,
			signatures: [],
		});

		(tx.signatures as Buffer[]).push(
			signData(
				Buffer.concat([Buffer.from(networkIdentifier, 'hex'), tx.getSigningBytes()]),
				this._state.passphrase as string,
			),
		);

		return tx.getBytes().toString('hex');
	}
}

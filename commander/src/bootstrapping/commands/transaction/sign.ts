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
 *
 */
import { flags as flagParser } from '@oclif/command';
import * as cryptography from '@liskhq/lisk-cryptography';
import { Application, PartialApplicationConfig } from 'lisk-framework';
import * as transactions from '@liskhq/lisk-transactions';

import { BaseIPCClientCommand } from '../base_ipc_client';
import { flagsWithParser } from '../../../utils/flags';
import { getPassphraseFromPrompt } from '../../../utils/reader';
import {
	decodeTransaction,
	encodeTransaction,
	getAssetSchema,
	transactionToJSON,
} from '../../../utils/transaction';
import { Schema } from '../../../types';
import { getGenesisBlockAndConfig } from '../../../utils/path';

interface KeysAsset {
	mandatoryKeys: Array<Readonly<string>>;
	optionalKeys: Array<Readonly<string>>;
}
export abstract class SignCommand extends BaseIPCClientCommand {
	static description = 'Sign encoded transaction.';

	static args = [
		...BaseIPCClientCommand.args,
		{
			name: 'transaction',
			required: true,
			description: 'The transaction to be signed encoded as hex string',
		},
	];

	static flags = {
		...BaseIPCClientCommand.flags,
		network: flagsWithParser.network,
		passphrase: flagsWithParser.passphrase,
		json: flagsWithParser.json,
		offline: flagsWithParser.offline,
		'include-sender': flagParser.boolean({
			description: 'Include sender signature in transaction.',
			default: false,
		}),
		'mandatory-keys': flagParser.string({
			multiple: true,
			description: 'Mandatory publicKey string in hex format.',
		}),
		'optional-keys': flagParser.string({
			multiple: true,
			description: 'Optional publicKey string in hex format.',
		}),
		'network-identifier': flagsWithParser.networkIdentifier,
		'sender-public-key': flagsWithParser.senderPublicKey,
	};

	static examples = [
		'transaction:sign <hex-encoded-binary-transaction>',
		'transaction:sign <hex-encoded-binary-transaction> --network testnet',
	];

	async run(): Promise<void> {
		const {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { transaction },
			flags: {
				'data-path': dataPath,
				'include-sender': includeSender,
				'sender-public-key': senderPublicKey,
				'mandatory-keys': mandatoryKeys,
				'optional-keys': optionalKeys,
				json,
				passphrase: passphraseSource,
				offline,
				'network-identifier': networkIdentifierSource,
				network,
			},
		} = this.parse(SignCommand);

		if (offline && dataPath) {
			throw new Error('Flag: --data-path should not be specified while signing offline.');
		}

		if (offline && !networkIdentifierSource) {
			throw new Error('Flag: --network-identifier must be specified while signing offline.');
		}

		let networkIdentifier = networkIdentifierSource as string;
		if (!offline) {
			if (!this._client) {
				this.error('APIClient is not initialized.');
			}
			const nodeInfo = await this._client.node.getNodeInfo();
			networkIdentifier = nodeInfo.networkIdentifier;
		}

		if (!offline && networkIdentifierSource && networkIdentifier !== networkIdentifierSource) {
			throw new Error(
				`Invalid networkIdentifier specified, actual: ${networkIdentifierSource}, expected: ${networkIdentifier}.`,
			);
		}

		if (offline) {
			// Read network genesis block and config from the folder
			const { genesisBlock, config } = await getGenesisBlockAndConfig(network);
			const app = this.getApplication(genesisBlock, config);
			this._schema = app.getSchema();
		}

		const passphrase = passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));
		const networkIdentifierBuffer = Buffer.from(networkIdentifier, 'hex');
		const transactionObject = decodeTransaction(this._client, this._schema, transaction);
		const assetSchema = getAssetSchema(
			this._schema,
			transactionObject.moduleID as number,
			transactionObject.assetID as number,
		);
		let signedTransaction: Record<string, unknown>;

		// sign from multi sig account offline using input keys
		if (!includeSender && !senderPublicKey) {
			signedTransaction = transactions.signTransaction(
				assetSchema as Schema,
				transactionObject,
				networkIdentifierBuffer,
				passphrase,
			);
		} else if (offline) {
			if (!mandatoryKeys.length && !optionalKeys.length) {
				throw new Error(
					'--mandatory-keys or --optional-keys flag must be specified to sign transaction from multi signature account.',
				);
			}
			const keys = {
				mandatoryKeys: mandatoryKeys ? mandatoryKeys.map(k => Buffer.from(k, 'hex')) : [],
				optionalKeys: optionalKeys ? optionalKeys.map(k => Buffer.from(k, 'hex')) : [],
			};

			signedTransaction = transactions.signMultiSignatureTransaction(
				assetSchema as Schema,
				transactionObject,
				networkIdentifierBuffer,
				passphrase,
				keys,
				includeSender,
			);
		} else {
			// sign from multi sig account online using account keys
			if (!senderPublicKey) {
				throw new Error(
					'Sender publickey must be specified for signing transactions from multi signature account.',
				);
			}
			const address = cryptography.getAddressFromPublicKey(Buffer.from(senderPublicKey, 'hex'));
			const account = (await this._client?.account.get(address)) as { keys: KeysAsset };
			let keysAsset: KeysAsset;
			if (account.keys?.mandatoryKeys.length === 0 && account.keys?.optionalKeys.length === 0) {
				keysAsset = transactionObject.asset as KeysAsset;
			} else {
				keysAsset = account.keys;
			}
			const keys = {
				mandatoryKeys: keysAsset.mandatoryKeys.map(k => Buffer.from(k, 'hex')),
				optionalKeys: keysAsset.optionalKeys.map(k => Buffer.from(k, 'hex')),
			};

			signedTransaction = transactions.signMultiSignatureTransaction(
				assetSchema as Schema,
				transactionObject,
				networkIdentifierBuffer,
				passphrase,
				keys,
				includeSender,
			);
		}

		if (json) {
			this.printJSON({
				transaction: encodeTransaction(this._client, this._schema, signedTransaction).toString(
					'hex',
				),
			});
			this.printJSON({
				transaction: transactionToJSON(this._client, this._schema, signedTransaction),
			});
		} else {
			this.printJSON({
				transaction: encodeTransaction(this._client, this._schema, signedTransaction).toString(
					'hex',
				),
			});
		}
	}

	abstract getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application;
}

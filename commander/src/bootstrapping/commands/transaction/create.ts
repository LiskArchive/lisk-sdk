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
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { flags as flagParser } from '@oclif/command';
import { codec } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import { Application, PartialApplicationConfig } from 'lisk-framework';
import * as transactions from '@liskhq/lisk-transactions';
import * as validator from '@liskhq/lisk-validator';

import { BaseIPCClientCommand } from '../base_ipc_client';
import { flagsWithParser } from '../../../utils/flags';
import { getAssetFromPrompt, getPassphraseFromPrompt } from '../../../utils/reader';
import { encodeTransaction, transactionToJSON } from '../../../utils/transaction';
import { getGenesisBlockAndConfig } from '../../../utils/path';

interface Args {
	readonly moduleID: number;
	readonly assetID: number;
	readonly fee: string;
}

const isSequenceObject = (
	input: Record<string, unknown>,
	key: string,
): input is { sequence: { nonce: bigint } } => {
	const value = input[key];
	if (typeof value !== 'object' || Array.isArray(value) || value === null) {
		return false;
	}
	const sequence = value as Record<string, unknown>;
	if (typeof sequence.nonce !== 'bigint') {
		return false;
	}
	return true;
};

export abstract class CreateCommand extends BaseIPCClientCommand {
	static strict = false;
	static description =
		'Create transaction which can be broadcasted to the network. Note: fee and amount should be in Beddows!!';

	static args = [
		...BaseIPCClientCommand.args,
		{
			name: 'moduleID',
			required: true,
			description: 'Registered transaction module id.',
		},
		{
			name: 'assetID',
			required: true,
			description: 'Registered transaction asset id.',
		},
		{
			name: 'fee',
			required: true,
			description: 'Transaction fee in Beddows.',
		},
	];

	static examples = [
		'transaction:create 2 0 100000000 --asset=\'{"amount":100000000,"recipientAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","data":"send token"}\'',
		'transaction:create 2 0 100000000 --asset=\'{"amount":100000000,"recipientAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","data":"send token"}\' --json',
		'transaction:create 2 0 100000000 --offline --network mainnet --network-identifier 873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3 --nonce 1 --asset=\'{"amount":100000000,"recipientAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","data":"send token"}\'',
	];

	static flags = {
		...BaseIPCClientCommand.flags,
		network: flagsWithParser.network,
		passphrase: flagsWithParser.passphrase,
		asset: flagParser.string({
			char: 'a',
			description: 'Creates transaction with specific asset information',
		}),
		json: flagsWithParser.json,
		offline: flagsWithParser.offline,
		'no-signature': flagParser.boolean({
			description:
				'Creates the transaction without a signature. Your passphrase will therefore not be required',
		}),
		'network-identifier': flagsWithParser.networkIdentifier,
		nonce: flagParser.string({
			description: 'Nonce of the transaction.',
		}),
		'sender-public-key': flagParser.string({
			char: 's',
			description:
				'Creates the transaction with provided sender publickey, when passphrase is not provided',
		}),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				'data-path': dataPath,
				passphrase: passphraseSource,
				'no-signature': noSignature,
				'sender-public-key': senderPublicKeySource,
				asset: assetSource,
				json,
				'network-identifier': networkIdentifierSource,
				nonce: nonceSource,
				offline,
				network,
			},
		} = this.parse(CreateCommand);
		const { fee, moduleID, assetID } = args as Args;

		if (offline && dataPath) {
			throw new Error(
				'Flag: --data-path should not be specified while creating transaction offline.',
			);
		}

		if (!senderPublicKeySource && noSignature) {
			throw new Error('Sender public key must be specified when no-signature flags is used.');
		}

		if (offline && !networkIdentifierSource) {
			throw new Error(
				'Flag: --network-identifier must be specified while creating transaction offline.',
			);
		}

		if (offline && !nonceSource) {
			throw new Error('Flag: --nonce must be specified while creating transaction offline.');
		}

		if (offline) {
			// Read network genesis block and config from the folder
			const { genesisBlock, config } = await getGenesisBlockAndConfig(network);
			const app = this.getApplication(genesisBlock, config);
			this._schema = app.getSchema();
		}

		const assetSchema = this._schema.transactionsAssets.find(
			as => as.moduleID === Number(moduleID) && as.assetID === Number(assetID),
		);

		if (!assetSchema) {
			throw new Error(
				`Transaction moduleID:${moduleID} with assetID:${assetID} is not registered in the application.`,
			);
		}

		const rawAsset = assetSource
			? JSON.parse(assetSource)
			: await getAssetFromPrompt(assetSchema.schema);
		const assetObject = codec.fromJSON(assetSchema.schema, rawAsset);

		const assetErrors = validator.validator.validate(assetSchema.schema, assetObject);
		if (assetErrors.length) {
			throw new validator.LiskValidationError([...assetErrors]);
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

		const incompleteTransaction = {
			moduleID: Number(moduleID),
			assetID: Number(assetID),
			nonce: nonceSource ? BigInt(nonceSource) : undefined,
			fee: BigInt(fee),
			senderPublicKey: senderPublicKeySource
				? Buffer.from(senderPublicKeySource, 'hex')
				: undefined,
			asset: assetObject,
			signatures: [],
		};
		let passphrase = '';

		if (passphraseSource || !noSignature) {
			passphrase = passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));
			const { publicKey } = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
			incompleteTransaction.senderPublicKey = publicKey;
		}

		if (!offline) {
			if (!this._client) {
				this.error('APIClient is not initialized.');
			}
			const address = cryptography.getAddressFromPublicKey(
				incompleteTransaction.senderPublicKey as Buffer,
			);
			const account = await this._client.account.get(address);
			if (!isSequenceObject(account, 'sequence')) {
				this.error('Account does not have sequence property.');
			}
			incompleteTransaction.nonce = account.sequence.nonce;
		}

		if (!offline && nonceSource && BigInt(incompleteTransaction.nonce) > BigInt(nonceSource)) {
			throw new Error(
				`Invalid nonce specified, actual: ${nonceSource}, expected: ${(incompleteTransaction.nonce as bigint).toString()}`,
			);
		}

		const { asset, ...transactionWithoutAsset } = incompleteTransaction;

		const transactionErrors = validator.validator.validate(this._schema.transaction, {
			...transactionWithoutAsset,
			asset: Buffer.alloc(0),
		});
		if (transactionErrors.length) {
			throw new validator.LiskValidationError([...transactionErrors]);
		}

		const transactionObject = {
			...transactionWithoutAsset,
			asset: assetObject,
		};

		if (!noSignature) {
			transactions.signTransaction(
				assetSchema.schema,
				transactionObject,
				Buffer.from(networkIdentifier, 'hex'),
				passphrase,
			);
		}

		if (json) {
			this.printJSON({
				transaction: encodeTransaction(this._client, this._schema, transactionObject).toString(
					'hex',
				),
			});
			this.printJSON({
				transaction: transactionToJSON(this._client, this._schema, transactionObject),
			});
		} else {
			this.printJSON({
				transaction: encodeTransaction(this._client, this._schema, transactionObject).toString(
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

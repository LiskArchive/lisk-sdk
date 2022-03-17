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
/* eslint-disable no-param-reassign */
import * as apiClient from '@liskhq/lisk-api-client';
import { codec, Schema } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as transactions from '@liskhq/lisk-transactions';
import * as validator from '@liskhq/lisk-validator';
import Command, { flags as flagParser } from '@oclif/command';
import { Application, PartialApplicationConfig, RegisteredSchema } from 'lisk-framework';
import { PromiseResolvedType } from '../../../types';
import { flags as defaultFlags, flagsWithParser } from '../../../utils/flags';
import { getDefaultPath } from '../../../utils/path';
import { getAssetFromPrompt, getPassphraseFromPrompt } from '../../../utils/reader';
import {
	encodeTransaction,
	getApiClient,
	getAssetSchema,
	transactionToJSON,
} from '../../../utils/transaction';

interface Args {
	readonly moduleID: number;
	readonly assetID: number;
	readonly fee: string;
}

interface CreateFlags {
	'network-identifier'?: string;
	passphrase?: string;
	asset?: string;
	pretty?: boolean;
	offline: boolean;
	'data-path'?: string;
	'no-signature': boolean;
	'sender-public-key'?: string;
	nonce?: string;
	json?: boolean;
}

interface Transaction {
	moduleID: number;
	assetID: number;
	nonce: bigint;
	fee: bigint;
	senderPublicKey: Buffer;
	asset: object;
	signatures: never[];
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

const getAssetObject = async (
	registeredSchema: RegisteredSchema,
	flags: CreateFlags,
	args: Args,
) => {
	const assetSchema = getAssetSchema(registeredSchema, args.moduleID, args.assetID) as Schema;
	const rawAsset = flags.asset ? JSON.parse(flags.asset) : await getAssetFromPrompt(assetSchema);
	const assetObject = codec.fromJSON(assetSchema, rawAsset);

	const assetErrors = validator.validator.validate(assetSchema, assetObject);
	if (assetErrors.length) {
		throw new validator.LiskValidationError([...assetErrors]);
	}

	return assetObject;
};

const getPassphraseAddressAndPublicKey = async (flags: CreateFlags) => {
	let passphrase!: string;
	let publicKey!: Buffer;
	let address!: Buffer;

	if (flags['no-signature']) {
		publicKey = Buffer.from(flags['sender-public-key'] as string, 'hex');
		address = cryptography.getAddressFromPublicKey(publicKey);
		passphrase = '';
	} else {
		passphrase = flags.passphrase ?? (await getPassphraseFromPrompt('passphrase', true));
		const result = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
		publicKey = result.publicKey;
		address = result.address;
	}

	return { address, passphrase, publicKey };
};

const validateAndSignTransaction = (
	transaction: Transaction,
	schema: RegisteredSchema,
	networkIdentifier: string,
	passphrase: string,
	noSignature: boolean,
) => {
	const { asset, ...transactionWithoutAsset } = transaction;
	const assetSchema = getAssetSchema(schema, transaction.moduleID, transaction.assetID) as Schema;

	const transactionErrors = validator.validator.validate(schema.transaction, {
		...transactionWithoutAsset,
		asset: Buffer.alloc(0),
	});
	if (transactionErrors.length) {
		throw new validator.LiskValidationError([...transactionErrors]);
	}

	if (!noSignature) {
		return transactions.signTransaction(
			assetSchema,
			(transaction as unknown) as Record<string, unknown>,
			Buffer.from(networkIdentifier, 'hex'),
			passphrase,
		);
	}

	return (transaction as unknown) as Record<string, unknown>;
};

const createTransactionOffline = async (
	args: Args,
	flags: CreateFlags,
	registeredSchema: RegisteredSchema,
	transaction: Transaction,
) => {
	const asset = await getAssetObject(registeredSchema, flags, args);
	const { passphrase, publicKey } = await getPassphraseAddressAndPublicKey(flags);
	transaction.nonce = BigInt(flags.nonce ?? 0);
	transaction.asset = asset;
	transaction.senderPublicKey =
		publicKey || Buffer.from(flags['sender-public-key'] as string, 'hex');

	return validateAndSignTransaction(
		transaction,
		registeredSchema,
		flags['network-identifier'] as string,
		passphrase,
		flags['no-signature'],
	);
};

const createTransactionOnline = async (
	args: Args,
	flags: CreateFlags,
	client: apiClient.APIClient,
	registeredSchema: RegisteredSchema,
	transaction: Transaction,
) => {
	const nodeInfo = await client.node.getNodeInfo();
	const { address, passphrase, publicKey } = await getPassphraseAddressAndPublicKey(flags);
	const account = await client.account.get(address);
	const asset = await getAssetObject(registeredSchema, flags, args);

	if (flags['network-identifier'] && flags['network-identifier'] !== nodeInfo.networkIdentifier) {
		throw new Error(
			`Invalid networkIdentifier specified, actual: ${flags['network-identifier']}, expected: ${nodeInfo.networkIdentifier}.`,
		);
	}

	if (!isSequenceObject(account, 'sequence')) {
		throw new Error('Account does not have sequence property.');
	}

	if (flags.nonce && BigInt(account.sequence.nonce) > BigInt(flags.nonce)) {
		throw new Error(
			`Invalid nonce specified, actual: ${
				flags.nonce
			}, expected: ${account.sequence.nonce.toString()}`,
		);
	}

	transaction.nonce = flags.nonce ? BigInt(flags.nonce) : account.sequence.nonce;
	transaction.asset = asset;
	transaction.senderPublicKey =
		publicKey || Buffer.from(flags['sender-public-key'] as string, 'hex');

	return validateAndSignTransaction(
		transaction,
		registeredSchema,
		nodeInfo.networkIdentifier,
		passphrase,
		flags['no-signature'],
	);
};

export abstract class CreateCommand extends Command {
	static strict = false;
	static description =
		'Create transaction which can be broadcasted to the network. Note: fee and amount should be in Beddows!!';

	static args = [
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

	static flags: flagParser.Input<CreateFlags> = {
		passphrase: flagsWithParser.passphrase,
		asset: flagParser.string({
			char: 'a',
			description: 'Creates transaction with specific asset information',
		}),
		json: flagsWithParser.json,
		// We can't specify default value with `dependsOn` https://github.com/oclif/oclif/issues/211
		offline: flagParser.boolean({
			description: defaultFlags.offline.description,
			dependsOn: ['network-identifier', 'nonce'],
			exclusive: ['data-path'],
		}),
		'no-signature': flagParser.boolean({
			description:
				'Creates the transaction without a signature. Your passphrase will therefore not be required',
			dependsOn: ['sender-public-key'],
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
		'data-path': flagsWithParser.dataPath,
		pretty: flagsWithParser.pretty,
	};

	protected _client!: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>> | undefined;
	protected _schema!: RegisteredSchema;
	protected _dataPath!: string;

	async run(): Promise<void> {
		const { args, flags } = this.parse(CreateCommand);

		const incompleteTransaction = {
			moduleID: Number(args.moduleID),
			assetID: Number(args.assetID),
			fee: BigInt(args.fee),
			nonce: BigInt(0),
			senderPublicKey: Buffer.alloc(0),
			asset: {},
			signatures: [],
		};

		let transactionObject!: Record<string, unknown>;
		this._dataPath = flags['data-path'] ?? getDefaultPath(this.config.pjson.name);

		if (flags.offline) {
			const app = this.getApplication({}, {});
			this._schema = app.getSchema();

			transactionObject = await createTransactionOffline(
				args as Args,
				flags,
				this._schema,
				incompleteTransaction,
			);
		} else {
			this._client = await getApiClient(this._dataPath, this.config.pjson.name);
			this._schema = this._client.schemas;

			transactionObject = await createTransactionOnline(
				args as Args,
				flags,
				this._client,
				this._schema,
				incompleteTransaction,
			);
		}

		if (flags.json) {
			this.printJSON(!!flags.pretty, {
				transaction: encodeTransaction(this._schema, transactionObject, this._client).toString(
					'hex',
				),
			});
			this.printJSON(!!flags.pretty, {
				transaction: transactionToJSON(this._schema, transactionObject, this._client),
			});
		} else {
			this.printJSON(!!flags.pretty, {
				transaction: encodeTransaction(this._schema, transactionObject, this._client).toString(
					'hex',
				),
			});
		}
	}

	printJSON(pretty: boolean, message?: Record<string, unknown>): void {
		if (pretty) {
			this.log(JSON.stringify(message, undefined, '  '));
		} else {
			this.log(JSON.stringify(message));
		}
	}

	async finally(): Promise<void> {
		if (this._client) {
			await this._client.disconnect();
		}
	}

	abstract getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application;
}

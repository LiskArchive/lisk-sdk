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
import Command, { flags as flagParser } from '@oclif/command';
import * as apiClient from '@liskhq/lisk-api-client';
import { codec, Schema } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import { Application, PartialApplicationConfig, RegisteredSchema } from 'lisk-framework';
import * as transactions from '@liskhq/lisk-transactions';
import * as validator from '@liskhq/lisk-validator';

import { flagsWithParser } from '../../../utils/flags';
import { getAssetFromPrompt, getPassphraseFromPrompt } from '../../../utils/reader';
import {
	encodeTransaction,
	getApiClient,
	getAssetSchema,
	transactionToJSON,
} from '../../../utils/transaction';
import { getGenesisBlockAndConfig } from '../../../utils/path';

interface Args {
	readonly moduleID: number;
	readonly assetID: number;
	readonly fee: string;
}

interface CreateFlags {
	network: string;
	'network-identifier': string | undefined;
	passphrase: string | undefined;
	asset: string | undefined;
	pretty: boolean;
	offline: boolean;
	'data-path': string | undefined;
	'no-signature': boolean;
	nonce: string | undefined;
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
	if (flags.passphrase || !flags['no-signature']) {
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
	if (flags['data-path']) {
		throw new Error(
			'Flag: --data-path should not be specified while creating transaction offline.',
		);
	}

	if (!flags['network-identifier']) {
		throw new Error(
			'Flag: --network-identifier must be specified while creating transaction offline.',
		);
	}

	if (!flags.nonce) {
		throw new Error('Flag: --nonce must be specified while creating transaction offline.');
	}

	const asset = await getAssetObject(registeredSchema, flags, args);
	const { passphrase, publicKey } = await getPassphraseAddressAndPublicKey(flags);
	transaction.nonce = BigInt(flags.nonce);
	transaction.asset = asset;
	transaction.senderPublicKey = publicKey;

	return validateAndSignTransaction(
		transaction,
		registeredSchema,
		flags['network-identifier'],
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

	if (flags['network-identifier'] && flags['network-identifier'] !== nodeInfo.networkIdentifier) {
		throw new Error(
			`Invalid networkIdentifier specified, actual: ${flags['network-identifier']}, expected: ${nodeInfo.networkIdentifier}.`,
		);
	}

	const { address, passphrase, publicKey } = await getPassphraseAddressAndPublicKey(flags);
	const account = await client.account.get(address);
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
	const asset = await getAssetObject(registeredSchema, flags, args);

	transaction.asset = asset;
	transaction.senderPublicKey = publicKey;
	transaction.nonce = BigInt(account.sequence.nonce);

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

	static flags = {
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
		'data-path': flagsWithParser.dataPath,
		pretty: flagsWithParser.pretty,
	};

	async run(): Promise<void> {
		const { args, flags } = this.parse(CreateCommand);
		if (!flags['sender-public-key'] && flags['no-signature']) {
			throw new Error('Sender public key must be specified when no-signature flags is used.');
		}

		const incompleteTransaction = {
			moduleID: Number(args.moduleID),
			assetID: Number(args.assetID),
			fee: BigInt(args.fee),
			nonce: BigInt(0),
			senderPublicKey: Buffer.alloc(0),
			asset: {},
			signatures: [],
		};

		let client!: apiClient.APIClient;
		let schema!: RegisteredSchema;
		let transactionObject!: Record<string, unknown>;

		if (flags.offline) {
			const { genesisBlock, config } = await getGenesisBlockAndConfig(flags.network);
			const app = this.getApplication(genesisBlock, config);
			schema = app.getSchema();
			transactionObject = await createTransactionOffline(
				args as Args,
				flags,
				schema,
				incompleteTransaction,
			);
		} else {
			client = await getApiClient(flags['data-path'], this.config.pjson.name);
			schema = client.schemas;
			transactionObject = await createTransactionOnline(
				args as Args,
				flags,
				client,
				schema,
				incompleteTransaction,
			);
		}

		if (flags.json) {
			this.printJSON(flags.pretty, {
				transaction: encodeTransaction(schema, transactionObject, client).toString('hex'),
			});
			this.printJSON(flags.pretty, {
				transaction: transactionToJSON(schema, transactionObject, client),
			});
		} else {
			this.printJSON(flags.pretty, {
				transaction: encodeTransaction(schema, transactionObject, client).toString('hex'),
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

	abstract getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application;
}

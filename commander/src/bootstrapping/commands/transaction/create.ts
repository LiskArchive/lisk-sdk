/*
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
import { blockAssetSchema, eventSchema } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as transactions from '@liskhq/lisk-transactions';
import { validator } from '@liskhq/lisk-validator';
import { Command, Flags as flagParser } from '@oclif/core';
import {
	Application,
	Types,
	blockHeaderSchema,
	blockSchema,
	transactionSchema,
	Modules,
} from 'lisk-framework';
import { PromiseResolvedType } from '../../../types';
import { deriveKeypair } from '../../../utils/commons';
import { DEFAULT_KEY_DERIVATION_PATH } from '../../../utils/config';
import { flagsWithParser } from '../../../utils/flags';
import { getDefaultPath } from '../../../utils/path';
import { getParamsFromPrompt, getPassphraseFromPrompt, getFileParams } from '../../../utils/reader';
import {
	encodeTransaction,
	getApiClient,
	getParamsSchema,
	transactionToJSON,
} from '../../../utils/transaction';
import { SendCommand } from './send';

interface Args {
	readonly module: string;
	readonly command: string;
	readonly fee: string;
}

interface CreateFlags {
	'chain-id'?: string;
	passphrase?: string;
	params?: string;
	pretty: boolean;
	offline: boolean;
	send: boolean;
	'data-path'?: string;
	'no-signature': boolean;
	'sender-public-key'?: string;
	nonce?: string;
	file?: string;
	'key-derivation-path': string;
}

interface Transaction {
	module: string;
	command: string;
	nonce: string;
	fee: string;
	senderPublicKey: string;
	params: object;
	signatures: never[];
}

const getParamsObject = async (
	metadata: Modules.ModuleMetadataJSON[],
	flags: CreateFlags,
	args: Args,
) => {
	let params: Record<string, unknown>;

	const paramsSchema = getParamsSchema(metadata, args.module, args.command);
	if (!paramsSchema) {
		return {};
	}

	if (flags.file) {
		params = JSON.parse(getFileParams(flags.file));
	} else {
		params = flags.params ? JSON.parse(flags.params) : await getParamsFromPrompt(paramsSchema);
	}

	return params;
};

const getKeysFromFlags = async (flags: CreateFlags) => {
	let publicKey!: Buffer;
	let privateKey!: Buffer;
	let address!: Buffer;

	if (flags['no-signature']) {
		publicKey = Buffer.from(flags['sender-public-key'] as string, 'hex');
		address = cryptography.address.getAddressFromPublicKey(publicKey);
	} else {
		const passphrase = flags.passphrase ?? (await getPassphraseFromPrompt('passphrase'));
		const keys = await deriveKeypair(passphrase, flags['key-derivation-path']);
		publicKey = keys.publicKey;
		privateKey = keys.privateKey;
		address = cryptography.address.getAddressFromPublicKey(publicKey);
	}

	return { address, publicKey, privateKey };
};

const validateAndSignTransaction = (
	transaction: Transaction,
	schema: Types.RegisteredSchema,
	metadata: Modules.ModuleMetadataJSON[],
	chainID: string,
	privateKey: Buffer,
	noSignature: boolean,
) => {
	const { params, ...transactionWithoutParams } = transaction;
	const paramsSchema = getParamsSchema(metadata, transaction.module, transaction.command);

	const txObject = codec.fromJSON(schema.transaction, { ...transactionWithoutParams, params: '' });
	validator.validate(schema.transaction, txObject);

	const paramsObject = paramsSchema ? codec.fromJSON(paramsSchema, params) : {};

	const decodedTx = {
		...txObject,
		params: paramsObject,
	};

	if (!noSignature) {
		return transactions.signTransaction(
			decodedTx,
			Buffer.from(chainID, 'hex'),
			privateKey,
			paramsSchema,
		);
	}
	return decodedTx;
};

const createTransactionOffline = async (
	args: Args,
	flags: CreateFlags,
	registeredSchema: Types.RegisteredSchema,
	metadata: Modules.ModuleMetadataJSON[],
	transaction: Transaction,
) => {
	const params = await getParamsObject(metadata, flags, args);
	const { publicKey, privateKey } = await getKeysFromFlags(flags);
	transaction.nonce = flags.nonce ?? '0';
	transaction.params = params;
	transaction.senderPublicKey = publicKey.toString('hex');

	return validateAndSignTransaction(
		transaction,
		registeredSchema,
		metadata,
		flags['chain-id'] as string,
		privateKey,
		flags['no-signature'],
	);
};

const createTransactionOnline = async (
	args: Args,
	flags: CreateFlags,
	client: apiClient.APIClient,
	registeredSchema: Types.RegisteredSchema,
	metadata: Modules.ModuleMetadataJSON[],
	transaction: Transaction,
) => {
	const nodeInfo = await client.node.getNodeInfo();
	const { address, privateKey, publicKey } = await getKeysFromFlags(flags);
	const account = await client.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: cryptography.address.getLisk32AddressFromAddress(address),
	});
	const params = await getParamsObject(metadata, flags, args);

	if (flags['chain-id'] && flags['chain-id'] !== nodeInfo.chainID) {
		throw new Error(
			`Invalid chainID specified, actual: ${flags['chain-id']}, expected: ${nodeInfo.chainID}.`,
		);
	}

	if (flags.nonce && BigInt(account.nonce) > BigInt(flags.nonce)) {
		throw new Error(
			`Invalid nonce specified, actual: ${flags.nonce}, expected: ${account.nonce.toString()}`,
		);
	}

	transaction.nonce = flags.nonce ? flags.nonce : account.nonce;
	transaction.params = params;
	transaction.senderPublicKey = publicKey.toString('hex');

	return validateAndSignTransaction(
		transaction,
		registeredSchema,
		metadata,
		nodeInfo.chainID,
		privateKey,
		flags['no-signature'],
	);
};

export abstract class CreateCommand extends Command {
	static strict = false;
	static description =
		'Create transaction which can be broadcasted to the network. Note: fee and amount should be in Beddows!!';

	static args = [
		{
			name: 'module',
			required: true,
			description: 'Registered transaction module.',
		},
		{
			name: 'command',
			required: true,
			description: 'Registered transaction command.',
		},
		{
			name: 'fee',
			required: true,
			description: 'Transaction fee in Beddows.',
		},
	];

	static examples = [
		'transaction:create token transfer 100000000 --params=\'{"amount":100000000,"tokenID":"0400000000000000","recipientAddress":"lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz","data":"send token"}\'',
		'transaction:create token transfer 100000000 --params=\'{"amount":100000000,"tokenID":"0400000000000000","recipientAddress":"lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz","data":"send token"}\' --json',
		'transaction:create token transfer 100000000 --offline --network mainnet --chain-id 10000000 --nonce 1 --params=\'{"amount":100000000,"tokenID":"0400000000000000","recipientAddress":"lskycz7hvr8yfu74bcwxy2n4mopfmjancgdvxq8xz","data":"send token"}\'',
		'transaction:create token transfer 100000000 --file=/txn_params.json',
		'transaction:create token transfer 100000000 --file=/txn_params.json --json',
	];

	static flags = {
		passphrase: flagsWithParser.passphrase,
		params: flagParser.string({
			char: 'a',
			description: 'Creates transaction with specific params information',
		}),
		json: flagsWithParser.json,
		// We can't specify default value with `dependsOn` https://github.com/oclif/oclif/issues/211
		offline: flagParser.boolean({
			...flagsWithParser.offline,
			dependsOn: ['chain-id', 'nonce'],
			exclusive: ['data-path'],
		}),
		send: flagParser.boolean({
			description: 'Create and immediately send transaction to a node',
			exclusive: ['offline'],
		}),
		'no-signature': flagParser.boolean({
			description:
				'Creates the transaction without a signature. Your passphrase will therefore not be required',
			dependsOn: ['sender-public-key'],
		}),
		'chain-id': flagsWithParser.chainID,
		nonce: flagParser.string({
			description: 'Nonce of the transaction.',
		}),
		'sender-public-key': flagsWithParser.senderPublicKey,
		'data-path': flagsWithParser.dataPath,
		'key-derivation-path': flagParser.string({
			default: DEFAULT_KEY_DERIVATION_PATH,
			description: 'Key derivation path to use to derive keypair from passphrase',
			char: 'k',
		}),
		pretty: flagsWithParser.pretty,
		file: flagsWithParser.file,
	};

	protected _client!: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>> | undefined;
	protected _schema!: Types.RegisteredSchema;
	protected _metadata!: Modules.ModuleMetadataJSON[];
	protected _dataPath!: string;

	async run(): Promise<void> {
		const { args, flags } = await this.parse(CreateCommand);

		const incompleteTransaction = {
			module: args.module,
			command: args.command,
			fee: args.fee,
			nonce: '0',
			senderPublicKey: '',
			params: {},
			signatures: [],
		};

		let transactionObject!: Record<string, unknown>;
		this._dataPath = flags['data-path'] ?? getDefaultPath(this.config.pjson.name);

		if (flags.offline) {
			const app = this.getApplication({
				genesis: {
					chainID: flags['chain-id'],
				},
			});

			this._metadata = app.getMetadata();
			this._schema = {
				header: blockHeaderSchema,
				transaction: transactionSchema,
				block: blockSchema,
				asset: blockAssetSchema,
				event: eventSchema,
			};

			transactionObject = await createTransactionOffline(
				args as Args,
				flags,
				this._schema,
				this._metadata,
				incompleteTransaction,
			);
		} else {
			this._client = await getApiClient(this._dataPath, this.config.pjson.name);
			this._schema = this._client.schema;

			transactionObject = await createTransactionOnline(
				args as Args,
				flags,
				this._client,
				this._schema,
				this._client.metadata,
				incompleteTransaction,
			);
		}

		const encodedTransaction = encodeTransaction(
			this._schema,
			this._metadata,
			transactionObject,
			this._client,
		).toString('hex');

		this.printJSON(flags.pretty, {
			transaction: encodedTransaction,
		});

		if (flags.json) {
			this.printJSON(flags.pretty, {
				transaction: transactionToJSON(
					this._schema,
					this._metadata,
					transactionObject,
					this._client,
				),
			});
		}

		if (flags.send) {
			await SendCommand.run([encodedTransaction, `--data-path=${this._dataPath}`], this.config);
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

	abstract getApplication(config: Types.PartialApplicationConfig): Application;
}

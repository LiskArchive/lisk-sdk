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
import { codec, Schema } from '@liskhq/lisk-codec';
import * as cryptography from '@liskhq/lisk-cryptography';
import * as transactions from '@liskhq/lisk-transactions';
import * as validator from '@liskhq/lisk-validator';
import Command, { flags as flagParser } from '@oclif/command';
import { Application, PartialApplicationConfig, RegisteredSchema } from 'lisk-framework';
import { PromiseResolvedType } from '../../../types';
import { flagsWithParser } from '../../../utils/flags';
import { getDefaultPath } from '../../../utils/path';
import { getParamsFromPrompt, getPassphraseFromPrompt } from '../../../utils/reader';
import {
	encodeTransaction,
	getApiClient,
	getParamsSchema,
	transactionToJSON,
} from '../../../utils/transaction';

interface Args {
	readonly moduleID: number;
	readonly commandID: number;
	readonly fee: string;
}

interface CreateFlags {
	'network-identifier'?: string;
	passphrase?: string;
	params?: string;
	pretty: boolean;
	offline: boolean;
	'data-path'?: string;
	'no-signature': boolean;
	'sender-public-key'?: string;
	nonce?: string;
}

interface Transaction {
	moduleID: number;
	commandID: number;
	nonce: bigint;
	fee: bigint;
	senderPublicKey: Buffer;
	params: object;
	signatures: never[];
}

const getParamsObject = async (
	registeredSchema: RegisteredSchema,
	flags: CreateFlags,
	args: Args,
) => {
	const paramsSchema = getParamsSchema(registeredSchema, args.moduleID, args.commandID) as Schema;
	const rawParams = flags.params
		? JSON.parse(flags.params)
		: await getParamsFromPrompt(paramsSchema);
	const paramsObject = codec.fromJSON(paramsSchema, rawParams);

	const paramsErrors = validator.validator.validate(paramsSchema, paramsObject);
	if (paramsErrors.length) {
		throw new validator.LiskValidationError([...paramsErrors]);
	}

	return paramsObject;
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
	const { params, ...transactionWithoutParams } = transaction;
	const paramsSchema = getParamsSchema(
		schema,
		transaction.moduleID,
		transaction.commandID,
	) as Schema;

	const transactionErrors = validator.validator.validate(schema.transaction, {
		...transactionWithoutParams,
		params: Buffer.alloc(0),
	});
	if (transactionErrors.length) {
		throw new validator.LiskValidationError([...transactionErrors]);
	}

	if (!noSignature) {
		return transactions.signTransaction(
			paramsSchema,
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
	const params = await getParamsObject(registeredSchema, flags, args);
	const { passphrase, publicKey } = await getPassphraseAddressAndPublicKey(flags);
	transaction.nonce = BigInt(flags.nonce);
	transaction.params = params;
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
	const account = await client.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.toString('hex'),
	});
	const params = await getParamsObject(registeredSchema, flags, args);

	if (flags['network-identifier'] && flags['network-identifier'] !== nodeInfo.networkIdentifier) {
		throw new Error(
			`Invalid networkIdentifier specified, actual: ${flags['network-identifier']}, expected: ${nodeInfo.networkIdentifier}.`,
		);
	}

	if (flags.nonce && BigInt(account.nonce) > BigInt(flags.nonce)) {
		throw new Error(
			`Invalid nonce specified, actual: ${flags.nonce}, expected: ${account.nonce.toString()}`,
		);
	}

	transaction.nonce = flags.nonce ? BigInt(flags.nonce) : BigInt(account.nonce);
	transaction.params = params;
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
			name: 'commandID',
			required: true,
			description: 'Registered transaction command id.',
		},
		{
			name: 'fee',
			required: true,
			description: 'Transaction fee in Beddows.',
		},
	];

	static examples = [
		'transaction:create 2 0 100000000 --params=\'{"amount":100000000,"recipientAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","data":"send token"}\'',
		'transaction:create 2 0 100000000 --params=\'{"amount":100000000,"recipientAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","data":"send token"}\' --json',
		'transaction:create 2 0 100000000 --offline --network mainnet --network-identifier 873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3 --nonce 1 --params=\'{"amount":100000000,"recipientAddress":"ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815","data":"send token"}\'',
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
			commandID: Number(args.commandID),
			fee: BigInt(args.fee),
			nonce: BigInt(0),
			senderPublicKey: Buffer.alloc(0),
			params: {},
			signatures: [],
		};

		let transactionObject!: Record<string, unknown>;
		this._dataPath = flags['data-path'] ?? getDefaultPath(this.config.pjson.name);

		if (flags.offline) {
			const app = this.getApplication({});
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
			this.printJSON(flags.pretty, {
				transaction: encodeTransaction(this._schema, transactionObject, this._client).toString(
					'hex',
				),
			});
			this.printJSON(flags.pretty, {
				transaction: transactionToJSON(this._schema, transactionObject, this._client),
			});
		} else {
			this.printJSON(flags.pretty, {
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

	abstract getApplication(config: PartialApplicationConfig): Application;
}

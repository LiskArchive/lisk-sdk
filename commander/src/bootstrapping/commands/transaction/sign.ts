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
import Command, { flags as flagParser } from '@oclif/command';
import * as apiClient from '@liskhq/lisk-api-client';
import * as cryptography from '@liskhq/lisk-cryptography';
import { Application, PartialApplicationConfig, RegisteredSchema } from 'lisk-framework';
import * as transactions from '@liskhq/lisk-transactions';

import { flagsWithParser } from '../../../utils/flags';
import { getPassphraseFromPrompt } from '../../../utils/reader';
import {
	decodeTransaction,
	encodeTransaction,
	getApiClient,
	transactionToJSON,
	getAssetSchema,
} from '../../../utils/transaction';
import { getDefaultPath } from '../../../utils/path';
import { isApplicationRunning } from '../../../utils/application';
import { PromiseResolvedType } from '../../../types';

interface KeysAsset {
	mandatoryKeys: Array<Readonly<string>>;
	optionalKeys: Array<Readonly<string>>;
}

interface Keys {
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
}

interface SignFlags {
	'network-identifier': string | undefined;
	passphrase: string | undefined;
	'include-sender': boolean;
	offline: boolean;
	'data-path': string | undefined;
	'sender-public-key': string | undefined;
	'mandatory-keys': string[];
	'optional-keys': string[];
}

const signTransaction = async (
	flags: SignFlags,
	registeredSchema: RegisteredSchema,
	transactionHexStr: string,
	networkIdentifier: string | undefined,
	keys: Keys,
) => {
	const transactionObject = decodeTransaction(registeredSchema, transactionHexStr);
	// eslint-disable-next-line @typescript-eslint/ban-types
	const assetSchema = getAssetSchema(
		registeredSchema,
		transactionObject.moduleID as number,
		transactionObject.assetID as number,
	) as object;
	const networkIdentifierBuffer = Buffer.from(networkIdentifier as string, 'hex');
	const passphrase = flags.passphrase ?? (await getPassphraseFromPrompt('passphrase', true));

	// sign from multi sig account offline using input keys
	if (!flags['include-sender'] && !flags['sender-public-key']) {
		return transactions.signTransaction(
			assetSchema,
			transactionObject,
			networkIdentifierBuffer,
			passphrase,
		);
	}

	return transactions.signMultiSignatureTransaction(
		assetSchema,
		transactionObject,
		networkIdentifierBuffer,
		passphrase,
		keys,
		flags['include-sender'],
	);
};

const signTransactionOffline = async (
	flags: SignFlags,
	registeredSchema: RegisteredSchema,
	transactionHexStr: string,
): Promise<Record<string, unknown>> => {
	let signedTransaction: Record<string, unknown>;

	if (!flags['include-sender'] && !flags['sender-public-key']) {
		signedTransaction = await signTransaction(
			flags,
			registeredSchema,
			transactionHexStr,
			flags['network-identifier'],
			{} as Keys,
		);
		return signedTransaction;
	}

	const mandatoryKeys = flags['mandatory-keys'];
	const optionalKeys = flags['optional-keys'];
	if (!mandatoryKeys.length && !optionalKeys.length) {
		throw new Error(
			'--mandatory-keys or --optional-keys flag must be specified to sign transaction from multi signature account.',
		);
	}
	const keys = {
		mandatoryKeys: mandatoryKeys ? mandatoryKeys.map(k => Buffer.from(k, 'hex')) : [],
		optionalKeys: optionalKeys ? optionalKeys.map(k => Buffer.from(k, 'hex')) : [],
	};

	signedTransaction = await signTransaction(
		flags,
		registeredSchema,
		transactionHexStr,
		flags['network-identifier'],
		keys,
	);
	return signedTransaction;
};

const signTransactionOnline = async (
	flags: SignFlags,
	client: apiClient.APIClient,
	registeredSchema: RegisteredSchema,
	transactionHexStr: string,
) => {
	// Sign non multi-sig transaction
	const transactionObject = decodeTransaction(registeredSchema, transactionHexStr);
	const passphrase = flags.passphrase ?? (await getPassphraseFromPrompt('passphrase', true));
	const address = cryptography.getAddressFromPassphrase(passphrase);

	let signedTransaction: Record<string, unknown>;

	if (!flags['include-sender']) {
		signedTransaction = await client.transaction.sign(transactionObject, [passphrase]);
		return signedTransaction;
	}

	// Sign multi-sig transaction
	const account = (await client.account.get(address)) as { keys: KeysAsset };
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

	signedTransaction = await client.transaction.sign(transactionObject, [passphrase], {
		includeSenderSignature: flags['include-sender'],
		multisignatureKeys: keys,
	});
	return signedTransaction;
};

export abstract class SignCommand extends Command {
	static description = 'Sign encoded transaction.';

	static args = [
		{
			name: 'transaction',
			required: true,
			description: 'The transaction to be signed encoded as hex string',
		},
	];

	static flags = {
		passphrase: flagsWithParser.passphrase,
		json: flagsWithParser.json,
		offline: {
			...flagsWithParser.offline,
			dependsOn: ['network-identifier'],
			exclusive: ['data-path'],
		},
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
		'data-path': flagsWithParser.dataPath,
		pretty: flagsWithParser.pretty,
	};

	static examples = [
		'transaction:sign <hex-encoded-binary-transaction>',
		'transaction:sign <hex-encoded-binary-transaction> --network testnet',
	];

	protected _client: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>> | undefined;
	protected _schema!: RegisteredSchema;
	protected _dataPath!: string;

	async run(): Promise<void> {
		const {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { transaction },
			flags,
		} = this.parse(SignCommand);
		const { offline, 'data-path': dataPath } = flags;
		this._dataPath = dataPath ?? getDefaultPath(this.config.pjson.name);

		let signedTransaction: Record<string, unknown>;

		if (offline) {
			const app = this.getApplication({}, {});
			this._schema = app.getSchema();
			signedTransaction = await signTransactionOffline(flags, this._schema, transaction);
		} else {
			this._client = await getApiClient(dataPath, this.config.pjson.name);
			this._schema = this._client.schemas;
			signedTransaction = await signTransactionOnline(
				flags,
				this._client,
				this._schema,
				transaction,
			);
		}

		if (flags.json) {
			this.printJSON(flags.pretty, {
				transaction: encodeTransaction(this._schema, signedTransaction, this._client).toString(
					'hex',
				),
			});
			this.printJSON(flags.pretty, {
				transaction: transactionToJSON(this._schema, signedTransaction, this._client),
			});
		} else {
			this.printJSON(flags.pretty, {
				transaction: encodeTransaction(this._schema, signedTransaction, this._client).toString(
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

	async finally(error?: Error | string): Promise<void> {
		if (error) {
			if (!isApplicationRunning(this._dataPath)) {
				throw new Error(`Application at data path ${this._dataPath} is not running.`);
			}
			this.error(error instanceof Error ? error.message : error);
		}
		if (this._client) {
			await this._client.disconnect();
		}
	}

	abstract getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application;
}

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
} from '../../../utils/transaction';
import { getGenesisBlockAndConfig } from '../../../utils/path';

interface KeysAsset {
	mandatoryKeys: Array<Readonly<string>>;
	optionalKeys: Array<Readonly<string>>;
}

interface Keys {
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
}

interface SignFlags {
	network: string;
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
	const networkIdentifierBuffer = Buffer.from(networkIdentifier as string, 'hex');
	const passphrase = flags.passphrase ?? (await getPassphraseFromPrompt('passphrase', true));

	// sign from multi sig account offline using input keys
	if (!flags['include-sender'] && !flags['sender-public-key']) {
		return transactions.signTransaction(
			registeredSchema,
			transactionObject,
			networkIdentifierBuffer,
			passphrase,
		);
	}

	return transactions.signMultiSignatureTransaction(
		registeredSchema,
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
	if (flags['data-path']) {
		throw new Error('Flag: --data-path should not be specified while signing offline.');
	}

	if (!flags['network-identifier']) {
		throw new Error('Flag: --network-identifier must be specified while signing offline.');
	}

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
	const nodeInfo = await client.node.getNodeInfo();
	if (flags['network-identifier'] && flags['network-identifier'] !== nodeInfo.networkIdentifier) {
		throw new Error(
			`Invalid networkIdentifier specified, actual: ${flags['network-identifier']}, expected: ${nodeInfo.networkIdentifier}.`,
		);
	}

	if (!flags['sender-public-key']) {
		throw new Error(
			'Sender publickey must be specified for signing transactions from multi signature account.',
		);
	}

	const address = cryptography.getAddressFromPublicKey(
		Buffer.from(flags['sender-public-key'], 'hex'),
	);
	const account = (await client.account.get(address)) as { keys: KeysAsset };
	const transactionObject = decodeTransaction(registeredSchema, transactionHexStr);

	let signedTransaction: Record<string, unknown>;

	if (!flags['include-sender'] && !flags['sender-public-key']) {
		signedTransaction = await signTransaction(
			flags,
			registeredSchema,
			transactionHexStr,
			nodeInfo.networkIdentifier,
			{} as Keys,
		);
		return signedTransaction;
	}

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

	signedTransaction = await signTransaction(
		flags,
		registeredSchema,
		transactionHexStr,
		nodeInfo.networkIdentifier,
		keys,
	);
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
		'data-path': flagsWithParser.dataPath,
		pretty: flagsWithParser.pretty,
	};

	static examples = [
		'transaction:sign <hex-encoded-binary-transaction>',
		'transaction:sign <hex-encoded-binary-transaction> --network testnet',
	];

	async run(): Promise<void> {
		const {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			args: { transaction },
			flags,
		} = this.parse(SignCommand);
		const { offline, network, 'data-path': dataPath } = flags;

		let client!: apiClient.APIClient;
		let schema!: RegisteredSchema;
		let signedTransaction: Record<string, unknown>;

		if (offline) {
			const { genesisBlock, config } = await getGenesisBlockAndConfig(network);
			const app = this.getApplication(genesisBlock, config);
			schema = app.getSchema();
			signedTransaction = await signTransactionOffline(flags, schema, transaction);
		} else {
			client = await getApiClient(dataPath, this.config.pjson.name);
			schema = client.schemas;
			signedTransaction = await signTransactionOnline(flags, client, schema, transaction);
		}

		if (flags.json) {
			this.printJSON(flags.pretty, {
				transaction: encodeTransaction(schema, signedTransaction, client).toString('hex'),
			});
			this.printJSON(flags.pretty, {
				transaction: transactionToJSON(schema, signedTransaction, client),
			});
		} else {
			this.printJSON(flags.pretty, {
				transaction: encodeTransaction(schema, signedTransaction, client).toString('hex'),
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

/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { signMultiSignatureTransaction } from '@liskhq/lisk-transactions';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getNetworkIdentifierWithInput } from '../../utils/network_identifier';
import { removeUndefinedValues } from '../../utils/object';
import { getPassphraseFromPrompt, readStdIn } from '../../utils/reader';
import {
	instantiateTransaction,
	parseTransactionString,
} from '../../utils/transactions';

interface Args {
	readonly transaction?: string;
}

const getTransactionInput = async (): Promise<string> => {
	try {
		const lines = await readStdIn();
		if (!lines.length) {
			throw new ValidationError('No transaction was provided.');
		}

		return lines[0];
	} catch (e) {
		throw new ValidationError('No transaction was provided.');
	}
};

const getPassphrasesFromPrompt = async (
	numberOfPassphrases = 1,
): Promise<ReadonlyArray<string>> => {
	const passphrases = [];
	for (let index = 0; index < numberOfPassphrases; index += 1) {
		const passphrase = await getPassphraseFromPrompt('passphrase', true);
		passphrases.push(passphrase);
	}

	return passphrases;
};

export default class SignCommand extends BaseCommand {
	static args = [
		{
			name: 'transaction',
			description: 'Transaction to sign in JSON format.',
		},
	];

	static description = `
	Sign a transaction using your secret passphrase.
	`;

	static examples = [
		'transaction:sign \'{"type":8,"senderPublicKey":"c094ebee7ec0","nonce":"1","fee":"1000","asset":{"amount":"100","recipientId":"555331L"}}\'',
		'\n',
		'transaction:sign \'{"type":8,"senderPublicKey":"c094ebee7ec0","nonce":"1","fee":"1000","asset":{"amount":"100","recipientId":"555331L"}}\' --mandatory-key=215b667a32a5cd51a94 --optional-key=922fbfdd596fa78269bbcadc67e --number-of-passphrases=2',
		'\n',
		'transaction:sign \'{"type":8,"senderPublicKey":"c094ebee7ec0","nonce":"1","fee":"1000","signatures":["a3cc97079e17bdd158526"],"asset":{"amount":"100","recipientId":"555331L"}}\' --mandatory-key=215b667a32a5cd51a94 --optional-key=922fbfdd596fa78269bbcadc67e --passphrase="inherit moon normal relief spring"',
		'\n',
		'transaction:sign \'{"type":8,"senderPublicKey":"c094ebee7ec0","nonce":"1","fee":"1000","asset":{"amount":"100","recipientId":"555331L"}}\' --mandatory-key=215b667a32a5cd51a94 --optional-key=922fbfdd596fa78269bbcadc67e --passphrase="inherit moon normal relief spring" --passphrase="wear protect skill sentence"',
	];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		'mandatory-key': flagParser.string({
			...commonFlags.mandatoryKey,
			multiple: true,
		}),
		'optional-key': flagParser.string({
			...commonFlags.optionalKey,
			multiple: true,
		}),
		passphrase: flagParser.string({
			...commonFlags.passphrase,
			multiple: true,
		}),
		'number-of-passphrases': flagParser.integer({
			...commonFlags.numberOfPassphrases,
			exclusive: ['passphrase'],
		}),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				networkIdentifier: networkIdentifierSource,
				passphrase: passphraseSource,
				'mandatory-key': mandatoryKeys,
				'optional-key': optionalKeys,
				'number-of-passphrases': numberOfPassphrases,
			},
		} = this.parse(SignCommand);

		const { transaction }: Args = args;
		const transactionInput = transaction ?? (await getTransactionInput());
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const transactionObject = parseTransactionString(transactionInput);
		const passphrase =
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			passphraseSource ?? (await getPassphrasesFromPrompt(numberOfPassphrases));

		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);
		const txInstance = instantiateTransaction({
			...transactionObject,
			networkIdentifier,
		});

		const keys = {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			mandatoryKeys: mandatoryKeys ?? [],
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			optionalKeys: optionalKeys ?? [],
		};

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (mandatoryKeys?.length || optionalKeys?.length) {
			// Sign for multi signature transaction
			passphrase.forEach(p => {
				signMultiSignatureTransaction({
					// eslint-disable-next-line
					transaction: {} as any,
					passphrase: p,
					networkIdentifier,
					keys,
				});
			});
		} else {
			// Sign for non-multi signature transaction
			txInstance.sign(Buffer.from(networkIdentifier, 'hex'), passphrase[0]);
		}

		const { errors } = txInstance.validate();

		if (errors.length !== 0) {
			throw errors;
		}

		this.print(removeUndefinedValues({} as object));
	}
}

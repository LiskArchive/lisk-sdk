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
	numberOfPassphrases: number = 1,
): Promise<ReadonlyArray<string>> => {
	const passphrases = [];
	// tslint:disable-next-line: no-let
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
		'transaction:sign \'{"id":"17528738200145418850","type":8,"senderPublicKey":"c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f","nonce":"1","fee":"100000000","asset":{"data":"{"liskhq":"zug"}","amount":"100000000000","recipientId":"5553317242494141914L"}}\'',
		'transaction:sign \'{"id":"17528738200145418850","type":8,"senderPublicKey":"c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f","nonce":"1","fee":"100000000","asset":{"data":"{"liskhq":"zug"}","amount":"100000000000","recipientId":"5553317242494141914L"}}\' --mandatory-key=215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca --optional-key=922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa --number-of-signatures=2 --number-of-passphrases=2',
		'transaction:sign \'{"id":"17528738200145418850","type":8,"senderPublicKey":"c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f","nonce":"1","fee":"100000000","asset":{"data":"{"liskhq":"zug"}","amount":"100000000000","recipientId":"5553317242494141914L"}}\' --mandatory-key=215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca --optional-key=922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa --number-of-signatures=2 --passphrase="inherit moon normal relief spring bargain hobby join baby flash fog blood" --passphrase="wear protect skill sentence lift enter wild sting lottery power floor neglect"',
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
		'number-of-signatures': flagParser.integer(commonFlags.numberOfSignatures),
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
				'number-of-signatures': numberOfSignatures,
				'number-of-passphrases': numberOfPassphrases,
			},
		} = this.parse(SignCommand);

		const { transaction }: Args = args;
		const transactionInput = transaction || (await getTransactionInput());
		const transactionObject = parseTransactionString(transactionInput);
		const passphrase =
			passphraseSource ??
			(await getPassphrasesFromPrompt(numberOfPassphrases as number));

		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);
		const txInstance = instantiateTransaction({
			...transactionObject,
			networkIdentifier,
		});

		interface Keys {
			readonly mandatoryKeys: Array<Readonly<string>>;
			readonly optionalKeys: Array<Readonly<string>>;
			readonly numberOfSignatures: number;
		}

		const keys = ({
			mandatoryKeys,
			optionalKeys,
			numberOfSignatures,
		} as unknown) as Keys;

		if (passphrase.length === 1) {
			// Sign for non-multi signature transaction
			txInstance.signAll(networkIdentifier, passphrase[0]);
		} else {
			// Sign for multi signature transaction
			txInstance.signAll(networkIdentifier, undefined, passphrase, keys);
		}

		const { errors } = txInstance.validate();

		if (errors.length !== 0) {
			throw errors;
		}

		this.print(removeUndefinedValues(txInstance.toJSON() as object));
	}
}

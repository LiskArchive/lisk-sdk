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
	];

	static flags = {
		...BaseCommand.flags,
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
		passphrase: flagParser.string(commonFlags.passphrase),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: {
				networkIdentifier: networkIdentifierSource,
				passphrase: passphraseSource,
			},
		} = this.parse(SignCommand);

		const { transaction }: Args = args;
		const transactionInput = transaction || (await getTransactionInput());
		const transactionObject = parseTransactionString(transactionInput);
		const passphrase =
			passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));

		const networkIdentifier = getNetworkIdentifierWithInput(
			networkIdentifierSource,
			this.userConfig.api.network,
		);
		const txInstance = instantiateTransaction({
			...transactionObject,
			networkIdentifier,
		});
		txInstance.sign(passphrase);

		const { errors } = txInstance.validate();

		if (errors.length !== 0) {
			throw errors;
		}

		this.print(removeUndefinedValues(txInstance.toJSON() as object));
	}
}

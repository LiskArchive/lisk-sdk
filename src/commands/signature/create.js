/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import elements from 'lisk-elements';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { getRawStdIn } from '../../utils/input/utils';
import { ValidationError } from '../../utils/error';
import parseTransactionString from '../../utils/transactions';
import getInputsFromSources from '../../utils/input';
import commonFlags from '../../utils/flags';

const getTransactionInput = async () =>
	getRawStdIn()
		.then(rawStdIn => {
			if (rawStdIn.length <= 0) {
				throw new ValidationError('No transaction was provided.');
			}
			return rawStdIn[0];
		})
		.catch(() => {
			throw new ValidationError('No transaction was provided.');
		});

export default class CreateCommand extends BaseCommand {
	async run() {
		const {
			args: { transaction },
			flags: { passphrase: passphraseSource },
		} = this.parse(CreateCommand);

		const transactionInput =
			transaction || (await getTransactionInput(transaction));

		const transactionObject = parseTransactionString(transactionInput);

		const { passphrase } = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
		});

		const result = elements.transaction.createSignatureObject(
			transactionObject,
			passphrase,
		);

		this.print(result);
	}
}

CreateCommand.args = [
	{
		name: 'transaction',
		description: 'Transaction in JSON format.',
	},
];

CreateCommand.flags = {
	...BaseCommand.flags,
	passphrase: flagParser.string(commonFlags.passphrase),
};

CreateCommand.description = `
Create a signature object for a transaction from a multisignature account.
Accepts a stringified JSON transaction as an argument.
`;

CreateCommand.examples = [
	'signature:create \'{"type":0,"amount":"10","recipientId":"100L","senderPublicKey":"abcd1234","timestamp":59353522,"asset":{},"id":"abcd1234","signature":"abcd1234"}\'',
];

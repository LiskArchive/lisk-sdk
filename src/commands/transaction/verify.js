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
import { getRawStdIn, getData } from '../../utils/input/utils';
import { ValidationError } from '../../utils/error';

const secondPublicKeyDescription = `Specifies a source for providing a second public key to the command. The second public key must be provided via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

	Note: if both transaction and second public key are passed via stdin, the transaction must be the first line.

	Examples:
	- --second-public-key file:/path/to/my/message.txt
	- --second-public-key 790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951
`;

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

const processSecondPublicKey = async secondPublicKey =>
	secondPublicKey.includes(':') ? getData(secondPublicKey) : secondPublicKey;

export default class VerifyCommand extends BaseCommand {
	async run() {
		const {
			args: { transaction },
			flags: { 'second-public-key': secondPublicKeySource },
		} = this.parse(VerifyCommand);

		const transactionInput = transaction || (await getTransactionInput());

		let transactionObject;
		try {
			transactionObject = JSON.parse(transactionInput);
		} catch (error) {
			throw new ValidationError('Could not parse transaction JSON.');
		}

		const secondPublicKey = secondPublicKeySource
			? await processSecondPublicKey(secondPublicKeySource)
			: null;

		const verified = elements.transaction.utils.verifyTransaction(
			transactionObject,
			secondPublicKey,
		);
		this.print({ verified });
	}
}

VerifyCommand.args = [
	{
		name: 'transaction',
		description: 'Transaction to verify.',
	},
];

VerifyCommand.flags = {
	...BaseCommand.flags,
	'second-public-key': flagParser.string({
		name: 'Second public key',
		description: secondPublicKeyDescription,
	}),
};

VerifyCommand.description = `
Verifies a transaction has a valid signature.
`;

VerifyCommand.examples = [
	'transaction:verify \'{"type":0,"amount":"100",...}\'',
	'transaction:verify \'{"type":0,"amount":"100",...}\' --second-public-key=647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6',
];

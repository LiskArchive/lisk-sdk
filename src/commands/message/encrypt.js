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
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import cryptography from '../../utils/cryptography';
import { ValidationError } from '../../utils/error';
import getInputsFromSources from '../../utils/input';
import commonOptions from '../../utils/options';

const processInputs = (recipient, message) => ({ passphrase, data }) =>
	cryptography.encryptMessage({
		message: message || data,
		passphrase,
		recipient,
	});

export default class EncryptCommand extends BaseCommand {
	async run() {
		const {
			args: { recipient, message },
			flags: { passphrase: passphraseSource, message: messageSource },
		} = this.parse(EncryptCommand);

		if (!message && !messageSource) {
			throw new ValidationError('No message was provided.');
		}

		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
			data: message
				? null
				: {
						source: messageSource,
					},
		});
		const result = processInputs(recipient, message)(inputs);
		this.print(result);
	}
}

EncryptCommand.args = [
	{
		name: 'recipient',
		description: 'Public key of the recipient of this message.',
		required: true,
	},
	{
		name: 'message',
		description: 'Message to encrypt.',
	},
];

EncryptCommand.flags = {
	...BaseCommand.flags,
	passphrase: flagParser.string(commonOptions.passphrase),
	message: flagParser.string(commonOptions.message),
};

EncryptCommand.description = `
Encrypts a message for a given recipient public key using your secret passphrase.
`;

EncryptCommand.examples = [
	'message:encrypt bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 "Hello world"',
];

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

const processInputs = message => ({ passphrase, data }) =>
	cryptography.signMessage({
		message: message || data,
		passphrase,
	});

export default class SignCommand extends BaseCommand {
	async run() {
		const {
			args: { message },
			flags: { passphrase: passphraseSource, message: messageSource },
		} = this.parse(SignCommand);

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
		const result = processInputs(message)(inputs);
		this.print(result);
	}
}

SignCommand.args = [
	{
		name: 'message',
		description: 'Message to sign.',
	},
];

SignCommand.flags = {
	...BaseCommand.flags,
	passphrase: flagParser.string(commonOptions.passphrase),
	message: flagParser.string(commonOptions.message),
};

SignCommand.description = `
Sign a message using your secret passphrase.
`;

SignCommand.examples = ['message:sign "Hello world"'];

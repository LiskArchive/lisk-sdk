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
import { signMessageWithPassphrase } from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getInputsFromSources, InputFromSourceOutput } from '../../utils/input';

interface Args {
	readonly message?: string;
}

const processInputs = (message?: string) => ({
	passphrase,
	data,
}: InputFromSourceOutput) => {
	const targetMessage = message || data;
	if (!targetMessage) {
		throw new ValidationError('No message was provided.');
	}
	if (!passphrase) {
		throw new ValidationError('No passphrase was provided.');
	}

	return signMessageWithPassphrase(targetMessage, passphrase);
};

export default class SignCommand extends BaseCommand {
	static args = [
		{
			name: 'message',
			description: 'Message to sign.',
		},
	];

	static description = `
	Signs a message using your secret passphrase.
	`;

	static examples = ['message:sign "Hello world"'];

	static flags = {
		...BaseCommand.flags,
		passphrase: flagParser.string(commonFlags.passphrase),
		message: flagParser.string(commonFlags.message),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { passphrase: passphraseSource, message: messageSource },
		} = this.parse(SignCommand);

		const { message }: Args = args;

		if (!message && !messageSource) {
			throw new ValidationError('No message was provided.');
		}

		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
			data: message
				? undefined
				: {
						source: messageSource,
				  },
		});
		const result = processInputs(message)(inputs);
		this.print(result);
	}
}

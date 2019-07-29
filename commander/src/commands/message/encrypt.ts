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
import { encryptMessageWithPassphrase } from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getInputsFromSources, InputFromSourceOutput } from '../../utils/input';

interface Args {
	readonly message?: string;
	readonly recipientPublicKey: string;
}

const processInputs = (recipientPublicKey: string, message?: string) => ({
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

	return {
		...encryptMessageWithPassphrase(
			targetMessage,
			passphrase,
			recipientPublicKey,
		),
		recipientPublicKey,
	};
};

export default class EncryptCommand extends BaseCommand {
	static args = [
		{
			name: 'recipientPublicKey',
			description: 'Public key of the recipient of the message.',
			required: true,
		},
		{
			name: 'message',
			description: 'Message to encrypt.',
		},
	];

	static description = `
	Encrypts a message for a given recipient public key using your secret passphrase.
	`;

	static examples = [
		'message:encrypt bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 "Hello world"',
	];

	static flags = {
		...BaseCommand.flags,
		passphrase: flagParser.string(commonFlags.passphrase),
		message: flagParser.string(commonFlags.message),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { passphrase: passphraseSource, message: messageSource },
		} = this.parse(EncryptCommand);

		const { recipientPublicKey, message }: Args = args;

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
		const result = processInputs(recipientPublicKey, message)(inputs);
		this.print(result);
	}
}

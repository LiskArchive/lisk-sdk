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
import { ed, legacy } from '@liskhq/lisk-cryptography';
import { Flags as flagParser } from '@oclif/core';

import BaseCommand from '../../../base';
import { ValidationError } from '../../../utils/error';
import { flags as commonFlags } from '../../../utils/flags';
import { getPassphraseFromPrompt, isFileSource, readFileSource } from '../../../utils/reader';

interface Args {
	readonly message?: string;
}

const processInputs = (passphrase: string, message?: string) => {
	if (!message) {
		throw new ValidationError('No message was provided.');
	}

	const keys = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);
	const signedMessageWithOnePassphrase = ed.signMessageWithPrivateKey(message, keys.privateKey);
	return {
		...signedMessageWithOnePassphrase,
		publicKey: signedMessageWithOnePassphrase.publicKey.toString('hex'),
		signature: signedMessageWithOnePassphrase.signature.toString('hex'),
	};
};

export class SignCommand extends BaseCommand {
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
		} = await this.parse(SignCommand);

		const { message }: Args = args;

		if (!message && !messageSource) {
			throw new ValidationError('No message was provided.');
		}

		const passphrase = passphraseSource ?? (await getPassphraseFromPrompt('passphrase'));
		const dataFromSource =
			messageSource && isFileSource(messageSource)
				? await readFileSource(messageSource)
				: messageSource;

		const result = processInputs(passphrase, message ?? dataFromSource);
		this.print(result);
	}
}

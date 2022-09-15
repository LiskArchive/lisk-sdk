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
import { encrypt, legacy } from '@liskhq/lisk-cryptography';
import { Flags as flagParser } from '@oclif/core';

import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import { getPassphraseFromPrompt, isFileSource, readFileSource } from '../../utils/reader';

interface Args {
	readonly message?: string;
	readonly recipientPublicKey: string;
}

const processInputs = (recipientPublicKey: string, passphrase: string, message?: string) => {
	if (!message) {
		throw new ValidationError('No message was provided.');
	}
	const keys = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);

	return {
		...encrypt.encryptMessageWithPrivateKey(
			message,
			keys.privateKey,
			Buffer.from(recipientPublicKey, 'hex'),
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
		} = await this.parse(EncryptCommand);

		const { recipientPublicKey, message } = args as Args;

		if (!message && !messageSource) {
			throw new ValidationError('No message was provided.');
		}
		const passphrase = passphraseSource ?? (await getPassphraseFromPrompt('passphrase', true));
		const dataFromSource =
			messageSource && isFileSource(messageSource)
				? await readFileSource(messageSource)
				: messageSource;

		const result = processInputs(recipientPublicKey, passphrase, message ?? dataFromSource);
		this.print(result);
	}
}

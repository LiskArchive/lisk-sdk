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
import { encrypt } from '@liskhq/lisk-cryptography';
import { Command, Flags as flagParser } from '@oclif/core';

import { flags as commonFlags, flagsWithParser } from '../../utils/flags';
import { getPassphraseFromPrompt, isFileSource, readFileSource } from '../../utils/reader';

interface Args {
	readonly message?: string;
}

export default class DecryptCommand extends Command {
	static args = [
		{
			name: 'message',
			description: 'Encrypted message.',
		},
	];

	static description = `
	Decrypts a previously encrypted message using your the password used to encrypt.
	`;

	static examples = ['message:decrypt '];

	static flags = {
		password: flagsWithParser.password,
		message: flagParser.string(commonFlags.message),
	};
	async run(): Promise<void> {
		const {
			args,
			flags: { password: passwordSource, message: messageSource },
		} = await this.parse(DecryptCommand);

		const { message } = args as Args;

		const password = passwordSource ?? (await getPassphraseFromPrompt('password'));
		const dataFromSource =
			messageSource && isFileSource(messageSource)
				? await readFileSource(messageSource)
				: messageSource;

		if (!message && !dataFromSource) {
			this.error('Message must be provided through the argument or the flag ');
		}

		const encryptedMessage = message ?? (dataFromSource as string);

		let parsedMessage;
		try {
			parsedMessage = JSON.parse(encryptedMessage) as ReturnType<
				typeof encrypt.parseEncryptedMessage
			>;
		} catch (error) {
			parsedMessage = encrypt.parseEncryptedMessage(encryptedMessage);
		}

		const result = await encrypt.decryptMessageWithPassword(parsedMessage, password, 'utf-8');
		this.log(result);
	}
}

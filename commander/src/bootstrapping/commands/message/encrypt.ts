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

import { ValidationError } from '../../../utils/error';
import { flags as commonFlags, flagsWithParser } from '../../../utils/flags';
import { getPassphraseFromPrompt, isFileSource, readFileSource } from '../../../utils/reader';

interface Args {
	readonly message?: string;
}

export class EncryptCommand extends Command {
	static args = [
		{
			name: 'message',
			description: 'Message to encrypt.',
		},
	];

	static description = `
	Encrypts a message with a password provided.
	`;

	static examples = ['message:encrypt "Hello world"'];

	static flags = {
		password: flagParser.string(commonFlags.password),
		message: flagParser.string(commonFlags.message),
		pretty: flagsWithParser.pretty,
		stringify: flagParser.boolean({
			description: 'Display encrypted message in stringified format',
			char: 's',
		}),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { password: passwordSource, message: messageSource, stringify, pretty },
		} = await this.parse(EncryptCommand);

		const { message } = args as Args;

		if (!message && !messageSource) {
			throw new ValidationError('No message was provided.');
		}
		const password = passwordSource ?? (await getPassphraseFromPrompt('password', true));
		const dataFromSource =
			messageSource && isFileSource(messageSource)
				? await readFileSource(messageSource)
				: messageSource;

		if (!message && !dataFromSource) {
			this.error('Message must be provided through the argument or the flag ');
		}

		const result = await encrypt.encryptMessageWithPassword(
			message ?? (dataFromSource as string),
			password,
		);
		if (stringify) {
			this.log(encrypt.stringifyEncryptedMessage(result));
			return;
		}
		this.log(!pretty ? JSON.stringify(result) : JSON.stringify(result, undefined, '  '));
	}
}

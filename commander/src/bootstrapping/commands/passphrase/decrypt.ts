/*
 * Copyright © 2021 Lisk Foundation
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
import * as cryptography from '@liskhq/lisk-cryptography';
import { Command } from '@oclif/core';
import { flagsWithParser } from '../../../utils/flags';
import { getPasswordFromPrompt } from '../../../utils/reader';

interface Args {
	readonly encryptedPassphrase?: string;
}

const processInputs = async (
	password: string,
	encryptedPassphrase: string,
): Promise<Record<string, string>> => {
	const encryptedPassphraseObject = cryptography.encrypt.parseEncryptedMessage(encryptedPassphrase);
	const passphrase = await cryptography.encrypt.decryptMessageWithPassword(
		encryptedPassphraseObject as never,
		password,
		'utf-8',
	);

	return { passphrase };
};

export class DecryptCommand extends Command {
	static args = [
		{
			name: 'encryptedPassphrase',
			description: 'Encrypted passphrase to decrypt.',
			required: true,
		},
	];

	static description =
		'Decrypt secret passphrase using the password provided at the time of encryption.';

	static examples = [
		'passphrase:decrypt "iterations=1000000&cipherText=9b1c60&iv=5c8843f52ed3c0f2aa0086b0&salt=2240b7f1aa9c899894e528cf5b600e9c&tag=23c01112134317a63bcf3d41ea74e83b&version=1"',
		'passphrase:decrypt "iterations=1000000&cipherText=9b1c60&iv=5c8843f52ed3c0f2aa0086b0&salt=2240b7f1aa9c899894e528cf5b600e9c&tag=23c01112134317a63bcf3d41ea74e83b&version=1" --password your-password',
	];

	static flags = {
		password: flagsWithParser.password,
		pretty: flagsWithParser.pretty,
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { password: passwordSource, pretty },
		} = await this.parse(DecryptCommand);
		const { encryptedPassphrase }: Args = args;
		const password = passwordSource ?? (await getPasswordFromPrompt('password', true));
		const result = await processInputs(password, encryptedPassphrase as string);
		this.printJSON(result, pretty);
	}

	public printJSON(message?: object, pretty = false): void {
		if (pretty) {
			this.log(JSON.stringify(message, undefined, '  '));
		} else {
			this.log(JSON.stringify(message));
		}
	}
}

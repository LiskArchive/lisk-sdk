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
import { decryptPassphraseWithPassword, parseEncryptedPassphrase } from '@liskhq/lisk-cryptography';
import { flags as flagParser } from '@oclif/command';

import BaseCommand from '../../base';
import { flags as commonFlags } from '../../utils/flags';
import { getPassphraseFromPrompt } from '../../utils/reader';

interface Args {
	readonly encryptedPassphrase?: string;
}

const processInputs = (password: string, encryptedPassphrase: string) => {
	const encryptedPassphraseObject = parseEncryptedPassphrase(encryptedPassphrase);
	const passphrase = decryptPassphraseWithPassword(encryptedPassphraseObject, password);

	return { passphrase };
};

export default class DecryptCommand extends BaseCommand {
	static args = [
		{
			name: 'encryptedPassphrase',
			description: 'Encrypted passphrase to decrypt.',
			required: true,
		},
	];

	static description = `
	Decrypts your secret passphrase using the password which was provided at the time of encryption.
	`;

	static examples = [
		'passphrase:decrypt "iterations=1000000&cipherText=9b1c60&iv=5c8843f52ed3c0f2aa0086b0&salt=2240b7f1aa9c899894e528cf5b600e9c&tag=23c01112134317a63bcf3d41ea74e83b&version=1"',
	];

	static flags = {
		...BaseCommand.flags,
		password: flagParser.string(commonFlags.password),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { password: passwordSource },
		} = this.parse(DecryptCommand);

		const { encryptedPassphrase }: Args = args;

		const password = passwordSource ?? (await getPassphraseFromPrompt('password', true));

		const result = processInputs(password, encryptedPassphrase as string);
		this.print(result);
	}
}

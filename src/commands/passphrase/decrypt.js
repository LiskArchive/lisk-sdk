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
import * as cryptography from '@liskhq/lisk-cryptography';
import BaseCommand from '../../base';
import { ValidationError } from '../../utils/error';
import { flags as commonFlags } from '../../utils/flags';
import {
	getInputsFromSources,
	getFirstLineFromString,
} from '../../utils/input';

const passphraseOptionDescription = `Specifies a source for providing an encrypted passphrase to the command. If a string is provided directly as an argument, this option will be ignored. The encrypted passphrase must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

	Note: if both an encrypted passphrase and the password are passed via stdin, the password must be the first line.

	Examples:
		- --passphrase file:/path/to/my/encrypted_passphrase.txt (takes the first line only)
		- --passphrase stdin (takes the first line only)
`;

const processInputs = encryptedPassphrase => ({ password, data }) => {
	const encryptedPassphraseObject = cryptography.parseEncryptedPassphrase(
		encryptedPassphrase || getFirstLineFromString(data),
	);
	const passphrase = cryptography.decryptPassphraseWithPassword(
		encryptedPassphraseObject,
		password,
	);
	return { passphrase };
};

export default class DecryptCommand extends BaseCommand {
	async run() {
		const {
			args: { encryptedPassphrase },
			flags: { passphrase: passphraseSource, password: passwordSource },
		} = this.parse(DecryptCommand);

		if (!encryptedPassphrase && !passphraseSource) {
			throw new ValidationError('No encrypted passphrase was provided.');
		}
		const inputs = await getInputsFromSources({
			password: {
				source: passwordSource,
			},
			data: encryptedPassphrase
				? null
				: {
						source: passphraseSource,
					},
		});
		const result = processInputs(encryptedPassphrase)(inputs);
		this.print(result);
	}
}

DecryptCommand.args = [
	{
		name: 'encryptedPassphrase',
		description: 'Encrypted passphrase to decrypt.',
	},
];

DecryptCommand.flags = {
	...BaseCommand.flags,
	password: flagParser.string(commonFlags.password),
	passphrase: flagParser.string({
		description: passphraseOptionDescription,
	}),
};

DecryptCommand.description = `
Decrypts your secret passphrase using the password which was provided at the time of encryption.
`;

DecryptCommand.examples = [
	'passphrase:decrypt "iterations=1000000&cipherText=9b1c60&iv=5c8843f52ed3c0f2aa0086b0&salt=2240b7f1aa9c899894e528cf5b600e9c&tag=23c01112134317a63bcf3d41ea74e83b&version=1"',
];

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
import cryptography from '../utils/cryptography';
import { ValidationError } from '../utils/error';
import { createCommand } from '../utils/helpers';
import getInputsFromSources, { getFirstLineFromString } from '../utils/input';
import commonOptions from '../utils/options';

const description = `Decrypts your secret passphrase using a password using the initialisation vector (IV) which was provided at the time of encryption.

	Example: decrypt passphrase salt=25606e160df4ababae0a0bd656310d7f&cipherText=4f513208f47dc539f7&iv=a048b9c1176b561a2f884f19&tag=2ef4db8d5e03c326fc26c0a8aa7adb69&version=1
`;

const passphraseOptionDescription = `Specifies a source for providing an encrypted passphrase to the command. If a string is provided directly as an argument, this option will be ignored. The encrypted passphrase must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

	Note: if both an encrypted passphrase and the password are passed via stdin, the password must be the first line.

	Examples:
		- --passphrase file:/path/to/my/encrypted_passphrase.txt (takes the first line only)
		- --passphrase stdin (takes the first line only)
`;

const processInputs = encryptedPassphrase => ({ password, data }) =>
	cryptography.decryptPassphrase({
		encryptedPassphrase: encryptedPassphrase || getFirstLineFromString(data),
		password,
	});

export const actionCreator = vorpal => async ({
	encryptedPassphrase,
	options,
}) => {
	const passphraseSource = options.passphrase;
	const passwordSource = options.password;

	if (!encryptedPassphrase && !passphraseSource) {
		throw new ValidationError('No encrypted passphrase was provided.');
	}

	return getInputsFromSources(vorpal, {
		password: {
			source: passwordSource,
		},
		data: encryptedPassphrase
			? null
			: {
					source: passphraseSource,
				},
	}).then(processInputs(encryptedPassphrase));
};

const decryptPassphrase = createCommand({
	command: 'decrypt passphrase [encryptedPassphrase]',
	description,
	actionCreator,
	options: [
		commonOptions.password,
		[commonOptions.passphrase[0], passphraseOptionDescription],
	],
	errorPrefix: 'Could not decrypt passphrase',
});

export default decryptPassphrase;

/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
import cryptoModule from '../utils/cryptoModule';
import { createCommand } from '../utils/helpers';
import getInputsFromSources, { getFirstLineFromString } from '../utils/input';
import commonOptions from '../utils/options';

const description = `Decrypt your secret passphrase using a password. You need the initialisation vector (IV) output at the time of encryption.

	Example: decrypt passphrase f74d6bc3bc68c9798213ee80444149e8 09dfba9040a1f2cc0b622dae18a158558b82f5ee953ece4e1ca43b8e81b15a7a
`;

const passphraseOptionDescription = `Specifies a source for providing an encrypted passphrase to the command. If a string is provided directly as an argument, this option will be ignored. The encrypted passphrase must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

	Note: if both an encrypted passphrase and the password are passed via stdin, the password must be the first line.

	Examples:
		- --passphrase file:/path/to/my/encrypted_passphrase.txt (takes the first line only)
		- --passphrase stdin (takes the first line only)
`;

const handlePasswordAndPassphrase = (iv, passphrase) => ({ password, data }) =>
	cryptoModule.decryptPassphrase({
		cipher: passphrase || getFirstLineFromString(data),
		iv,
		password,
	});

export const actionCreator = vorpal => async ({ iv, passphrase, options }) => {
	const passphraseSource = options.passphrase;
	const passwordSource = options.password;

	if (!passphrase && !passphraseSource) {
		throw new Error('No encrypted passphrase was provided.');
	}

	return getInputsFromSources(vorpal, {
		password: {
			source: passwordSource,
		},
		data: passphrase ? null : {
			source: passphraseSource,
		},
	})
		.then(handlePasswordAndPassphrase(iv, passphrase));
};

const decryptPassphrase = createCommand({
	command: 'decrypt passphrase <iv> [passphrase]',
	description,
	actionCreator,
	options: [
		commonOptions.password,
		[commonOptions.passphrase[0], passphraseOptionDescription],
	],
	errorPrefix: 'Could not decrypt passphrase',
});

export default decryptPassphrase;

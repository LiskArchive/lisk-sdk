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
import commonOptions from '../utils/options';
import { printResult } from '../utils/print';
import { createErrorHandler } from '../utils/helpers';
import {
	getStdIn,
	getPassphrase,
	getFirstLineFromString,
	getData,
} from '../utils/input';

const PASSWORD_DISPLAY_NAME = 'your password';

const description = `Decrypt your secret passphrase using a password. You need the initialisation vector (IV) output at the time of encryption.

	Example: decrypt passphrase f74d6bc3bc68c9798213ee80444149e8 09dfba9040a1f2cc0b622dae18a158558b82f5ee953ece4e1ca43b8e81b15a7a
`;

const passphraseOptionDescription = `Specifies a source for providing an encrypted passphrase to the command. If a string is provided directly as an argument, this option will be ignored. The encrypted passphrase must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

	Note: if both an encrypted passphrase and the password are passed via stdin, the password must be the first line.

	Examples:
	- --passphrase file:/path/to/my/encrypted_passphrase.txt (takes the first line only)
	- --passphrase stdin (takes the first line only)
`;

const handleInput = iv => ([cipher, password]) =>
	cryptoModule.decryptPassphrase({ cipher, iv }, password);

const decryptPassphrase = vorpal => ({ iv, passphrase, options }) => {
	const passphraseSource = options.passphrase;
	const passwordSource = options.password;

	return (passphrase || passphraseSource
		? getStdIn({
			passphraseIsRequired: passwordSource === 'stdin',
			dataIsRequired: passphraseSource === 'stdin',
		})
		: Promise.reject({ message: 'No passphrase was provided.' })
	)
		.then(stdIn => Promise.all([
			getData(passphrase, passphraseSource, getFirstLineFromString(stdIn.data)),
			getPassphrase(vorpal, passwordSource, stdIn.passphrase, {
				displayName: PASSWORD_DISPLAY_NAME,
			}),
		]))
		.then(handleInput(iv))
		.catch(createErrorHandler('Could not decrypt passphrase'))
		.then(printResult(vorpal, options));
};

function decryptPassphraseCommand(vorpal) {
	vorpal
		.command('decrypt passphrase <iv> [passphrase]')
		.option(...commonOptions.password)
		.option(commonOptions.passphrase[0], passphraseOptionDescription)
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description(description)
		.action(decryptPassphrase(vorpal));
}

export default decryptPassphraseCommand;

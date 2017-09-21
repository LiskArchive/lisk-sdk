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

	return getStdIn({
		passphraseIsRequired: passwordSource === 'stdin',
		dataIsRequired: passphraseSource === 'stdin',
	})
		.then(stdIn => Promise.all([
			getData(passphrase, passphraseSource, getFirstLineFromString(stdIn.data)),
			getPassphrase(vorpal, passwordSource, stdIn.passphrase, 'your password'),
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
		.action(decryptPassphrase(vorpal));
}

export default decryptPassphraseCommand;

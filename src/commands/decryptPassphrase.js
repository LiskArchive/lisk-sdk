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

const encryptedPassphraseOptionDescription = `Hello${' you'}`;

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
		.option(commonOptions.passphrase[0], encryptedPassphraseOptionDescription)
		.action(decryptPassphrase(vorpal));
}

export default decryptPassphraseCommand;

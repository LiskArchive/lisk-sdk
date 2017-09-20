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
import {
	getStdIn,
	getPassphrase,
	getData,
} from '../utils/input';

const encryptDescription = `Encrypt a message for a given recipient public key using your secret passphrase.

	Example: encrypt bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 'Hello world'
`;

const handlePassphraseAndMessage = recipient => ([passphrase, message]) =>
	cryptoModule.encrypt(message, passphrase, recipient);

const handleError = ({ message }) => ({ error: `Could not encrypt: ${message}` });

const encrypt = vorpal => ({ recipient, message, options }) => {
	const dataSource = options.message;
	const passphraseSource = options.passphrase;

	return getStdIn({
		passphraseIsRequired: passphraseSource === 'stdin',
		dataIsRequired: dataSource === 'stdin',
	})
		.then(stdIn => Promise.all([
			getPassphrase(vorpal, passphraseSource, stdIn),
			getData(message, dataSource, stdIn),
		]))
		.then(handlePassphraseAndMessage(recipient))
		.catch(handleError)
		.then(printResult(vorpal, options));
};

function encryptCommand(vorpal) {
	vorpal
		.command('encrypt message <recipient> [message]')
		.option(...commonOptions.passphrase)
		.option(...commonOptions.message)
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description(encryptDescription)
		.action(encrypt(vorpal));
}

export default encryptCommand;

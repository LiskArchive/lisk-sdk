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
	getData,
} from '../utils/input';

const description = `Encrypt a message for a given recipient public key using your secret passphrase.

	Example: encrypt message bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 'Hello world'
`;

const handlePassphraseAndMessage = recipient => ([passphrase, message]) =>
	cryptoModule.encryptMessage(message, passphrase, recipient);

const encrypt = vorpal => ({ recipient, message, options }) => {
	const messageSource = options.message;
	const passphraseSource = options.passphrase;

	return (message || messageSource
		? getStdIn({
			passphraseIsRequired: passphraseSource === 'stdin',
			dataIsRequired: messageSource === 'stdin',
		})
		: Promise.reject({ message: 'No message was provided.' })
	)
		.then(stdIn => Promise.all([
			getPassphrase(vorpal, passphraseSource, stdIn.passphrase, { shouldRepeat: true }),
			getData(message, messageSource, stdIn.data),
		]))
		.then(handlePassphraseAndMessage(recipient))
		.catch(createErrorHandler('Could not encrypt message'))
		.then(printResult(vorpal, options));
};

function encryptCommand(vorpal) {
	vorpal
		.command('encrypt message <recipient> [message]')
		.option(...commonOptions.passphrase)
		.option(...commonOptions.message)
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description(description)
		.action(encrypt(vorpal));
}

export default encryptCommand;

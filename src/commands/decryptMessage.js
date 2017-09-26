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

const description = `Decrypt an encrypted message from a given sender public key for a known nonce using your secret passphrase.

	Example: decrypt message bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 349d300c906a113340ff0563ef14a96c092236f331ca4639 e501c538311d38d3857afefa26207408f4bf7f1228
`;

const handlePassphrase = (vorpal, nonce, senderPublicKey) => ([passphrase, data]) =>
	cryptoModule.decryptMessage(data, nonce, passphrase, senderPublicKey);

const decryptMessage = vorpal => ({ message, nonce, senderPublicKey, options }) => {
	const passphraseSource = options.passphrase;
	const messageSource = options.message;

	return (message || messageSource
		? getStdIn({
			passphraseIsRequired: passphraseSource === 'stdin',
			dataIsRequired: messageSource === 'stdin',
		})
		: Promise.reject({ message: 'No message was provided.' })
	)
		.then(stdIn => Promise.all([
			getPassphrase(vorpal, options.passphrase, stdIn.passphrase),
			getData(message, messageSource, stdIn.data),
		]))
		.then(handlePassphrase(vorpal, nonce, senderPublicKey))
		.catch(createErrorHandler('Could not decrypt message'))
		.then(printResult(vorpal, options));
};

function decryptMessageCommand(vorpal) {
	vorpal
		.command('decrypt message <senderPublicKey> <nonce> [message]')
		.option(...commonOptions.passphrase)
		.option(...commonOptions.message)
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description(description)
		.action(decryptMessage(vorpal));
}

export default decryptMessageCommand;

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

const handleMessageAndPassphrase = (vorpal, recipient) => ([passphrase, data]) =>
	cryptoModule.encrypt(data, passphrase, recipient);

const handleError = ({ message }) => ({ error: `Could not encrypt: ${message}` });

const encrypt = vorpal => ({ recipient, data, options }) => {
	const dataSource = options.data;
	const passphraseSource = options.passphrase;

	return getStdIn({
		passphraseIsRequired: passphraseSource === 'stdin',
		dataIsRequired: dataSource === 'stdin',
	})
		.then(stdIn => Promise.all([
			getPassphrase(vorpal, passphraseSource, stdIn),
			getData(data, dataSource, stdIn),
		]))
		.then(handleMessageAndPassphrase(vorpal, recipient))
		.catch(handleError)
		.then(printResult(vorpal, options));
};

function encryptCommand(vorpal) {
	vorpal
		.command('encrypt <recipient> [data]')
		.option(...commonOptions.passphrase)
		.option(...commonOptions.data)
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description('Encrypt a message for a given recipient public key using your secret passphrase. \n E.g. encrypt "Hello world" bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0')
		.action(encrypt(vorpal));
}

export default encryptCommand;

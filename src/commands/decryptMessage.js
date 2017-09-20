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

const decryptDescription = `Decrypt an encrypted message from a given sender public key for a known nonce using your secret passphrase.

	Example: decrypt message bba7e2e6a4639c431b68e31115a71ffefcb4e025a4d1656405dfdcd8384719e0 349d300c906a113340ff0563ef14a96c092236f331ca4639 e501c538311d38d3857afefa26207408f4bf7f1228
`;

const handlePassphrase = (vorpal, nonce, senderPublicKey) => ([passphrase, data]) =>
	cryptoModule.decrypt(data, nonce, passphrase, senderPublicKey);

const handleError = ({ message }) => ({ error: `Could not decrypt: ${message}` });

const decrypt = vorpal => ({ message, nonce, senderPublicKey, options }) => {
	const passphraseSource = options.passphrase;
	const dataSource = options.message;

	return getStdIn({
		passphraseIsRequired: passphraseSource === 'stdin',
		dataIsRequired: dataSource === 'stdin',
	})
		.then(stdIn => Promise.all([
			getPassphrase(vorpal, options.passphrase, stdIn),
			getData(message, dataSource, stdIn),
		]))
		.then(handlePassphrase(vorpal, nonce, senderPublicKey))
		.catch(handleError)
		.then(printResult(vorpal, options));
};

function decryptCommand(vorpal) {
	vorpal
		.command('decrypt message <senderPublicKey> <nonce> [message]')
		.option(...commonOptions.passphrase)
		.option(...commonOptions.message)
		.option(...commonOptions.json)
		.option(...commonOptions.noJson)
		.description(decryptDescription)
		.action(decrypt(vorpal));
}

export default decryptCommand;

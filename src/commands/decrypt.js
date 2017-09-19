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

const handlePassphrase = (vorpal, nonce, senderPublicKey) => ([passphrase, data]) =>
	cryptoModule.decrypt(data, nonce, passphrase, senderPublicKey);

const handleError = ({ message }) => ({ error: `Could not decrypt: ${message}` });

const decrypt = vorpal => ({ encryptedMessage, nonce, senderPublicKey, options }) => {
	const passphraseSource = options.passphrase;
	const dataSource = options.data;

	return getStdIn({
		passphraseIsRequired: passphraseSource === 'stdin',
		dataIsRequired: dataSource === 'stdin',
	})
		.then(stdIn => Promise.all([
			getPassphrase(vorpal, options.passphrase, stdIn),
			getData(encryptedMessage, dataSource, stdIn),
		]))
		.then(handlePassphrase(vorpal, nonce, senderPublicKey))
		.catch(handleError)
		.then(printResult(vorpal, options));
};

function decryptCommand(vorpal) {
	vorpal
		.command('decrypt <senderPublicKey> <nonce> [encryptedMessage]')
		.option(...commonOptions.passphrase)
		.option(...commonOptions.data)
		.option('-j, --json', 'Sets output to json')
		.action(decrypt(vorpal));
}

export default decryptCommand;

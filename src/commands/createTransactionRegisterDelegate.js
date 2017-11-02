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
import {
	getStdIn,
	getPassphrase,
	getFirstLineFromString,
} from '../utils/input';
import { createCommand } from '../utils/helpers';
import commonOptions from '../utils/options';
import transactions from '../utils/transactions';

const description = `CCreates a transaction which will register an existing account as a delegate candidate if broadcast to the network.

	Examples:
	- create transaction register delegate username
	- create transaction 2 username
`;

const createDelegate = username => ([passphrase, secondPassphrase]) =>
	transactions.createDelegate(passphrase, username, secondPassphrase);

export const actionCreator = vorpal => async ({ username, options }) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
	} = options;

	return getStdIn({
		passphraseIsRequired: passphraseSource === 'stdin',
		dataIsRequired: secondPassphraseSource === 'stdin',
	})
		.then(stdIn => getPassphrase(vorpal, passphraseSource, stdIn.passphrase, { shouldRepeat: true })
			.then(passphrase => (secondPassphraseSource ? getPassphrase(
				vorpal,
				secondPassphraseSource,
				getFirstLineFromString(stdIn.data),
				{ shouldRepeat: true, displayName: 'your second secret passphrase' },
			) : Promise.resolve(null))
				.then(secondPassphrase => [passphrase, secondPassphrase]),
			),
		)
		.then(createDelegate(username));
};

const createTransactionRegisterSecondPassphrase = createCommand({
	command: 'create transaction register delegate <username>',
	alias: 'create transaction 2',
	description,
	actionCreator,
	options: [
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
	],
	errorPrefix: 'Could not create register delegate transaction',
});

export default createTransactionRegisterSecondPassphrase;

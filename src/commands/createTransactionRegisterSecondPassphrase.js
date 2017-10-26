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

const description = `Creates a transaction which will register a second passphrase for an existing account if broadcast to the network.

	Examples:
	- create transaction register second passphrase
	- create transaction 1
`;

export const createSignature = (
	[passphrase, secondPassphrase],
) => transactions.createSignature(passphrase, secondPassphrase);

export const actionCreator = vorpal => async ({ options }) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
	} = options;

	return getStdIn({
		passphraseIsRequired: passphraseSource === 'stdin',
		dataIsRequired: secondPassphraseSource === 'stdin',
	})
		.then(stdIn => getPassphrase(vorpal, passphraseSource, stdIn.passphrase, { shouldRepeat: true })
			.then(passphrase => getPassphrase(
				vorpal,
				secondPassphraseSource,
				getFirstLineFromString(stdIn.data),
				{ shouldRepeat: true, displayName: 'your second secret passphrase' },
			)
				.then(secondPassphrase => [passphrase, secondPassphrase]),
			),
		)
		.then(createSignature);
};

const createTransactionRegisterSecondPassphrase = createCommand({
	command: 'create transaction register second passphrase',
	alias: 'create transaction 1',
	description,
	actionCreator,
	options: [
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
	],
	errorPrefix: 'Could not create register second passphrase transaction',
});

export default createTransactionRegisterSecondPassphrase;

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
import { createLiskTransaction } from '../utils/liskInstance';

const description = `Creates a register second passphrase transaction for an existing account.

	Examples:
	- create transaction register second passphrase
	- create transaction 1
`;

export const createSignature = (
	[passphrase, secondPassphrase],
) => createLiskTransaction.createSignature(passphrase, secondPassphrase);

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
				{ shouldRepeat: true },
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
	errorPrefix: 'Could not create transaction',
});

export default createTransactionRegisterSecondPassphrase;

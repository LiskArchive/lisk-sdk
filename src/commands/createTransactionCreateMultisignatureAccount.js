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

const description = `Creates a transaction which will register a multisignature account for an existing account if broadcast to the network.
	The transaction command takes three required parameters, keysgroup as an array of public keys that are part of the multisignature group.
	Lifetime as a parameter of how many hours the transaction can be signed.
	Minimum as the amount of signatures needed until the transaction will be processed.

	Examples:
	- create transaction create multisignature account
	- create transaction 4
`;

const createMultisignatureAccount = (keysgroup, lifetime, minimum) =>
	([passphrase, secondPassphrase]) =>
		transactions.createMultisignature(
			passphrase,
			secondPassphrase,
			keysgroup,
			lifetime,
			minimum,
		);

export const actionCreator = vorpal => async ({ keysgroup, lifetime, minimum, options }) => {
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
		.then(createMultisignatureAccount(keysgroup, lifetime, minimum));
};

const createTransactionRegisterSecondPassphrase = createCommand({
	command: 'create transaction create multisignature account <keysgroup> <lifetime> <minimum>',
	alias: 'create transaction 4',
	description,
	actionCreator,
	options: [
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
	],
	errorPrefix: 'Could not create create multisignature group transaction',
});

export default createTransactionRegisterSecondPassphrase;

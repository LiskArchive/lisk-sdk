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
import {
	createCommand,
	checkAddress,
	checkAmount,
} from '../utils/helpers';
import commonOptions from '../utils/options';
import transactions from '../utils/transactions';

const description = `Creates a transaction which will transfer a defined amount if broadcast to the network.

	Examples:
	- create transaction transfer 100 13356260975429434553L
	- create transaction 0 100 13356260975429434553L
`;

const createTransfer = (amount, address) => ([passphrase, secondPassphrase]) =>
	transactions.createTransaction(address, amount, passphrase, secondPassphrase);

export const actionCreator = vorpal => async ({ amount, address, options }) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
	} = options;

	const transferAmount = checkAmount(amount);

	if (!transferAmount) {
		throw new Error('Amount to send must be a number with maximum 8 decimal places.');
	}

	const recipientAddress = checkAddress(address);

	if (!recipientAddress) {
		throw new Error('Not a valid recipient address.');
	}

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
		.then(createTransfer(transferAmount[0], recipientAddress[0]));
};

const createTransactionTransfer = createCommand({
	command: 'create transaction transfer <amount> <address>',
	alias: 'create transaction 0',
	description,
	actionCreator,
	options: [
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
	],
	errorPrefix: 'Could not create transfer transaction',
});

export default createTransactionTransfer;

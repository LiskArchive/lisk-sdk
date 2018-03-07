/*
 * LiskHQ/lisk-commander
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
import getInputsFromSources from '../utils/input';
import {
	createCommand,
	normalizeAmount,
	validateAddress,
} from '../utils/helpers';
import commonOptions from '../utils/options';
import transactions from '../utils/transactions';

const description = `Creates a transaction which will transfer the specified amount to an address if broadcast to the network.

	Examples:
	- create transaction transfer 100 13356260975429434553L
	- create transaction 0 100 13356260975429434553L
`;

const processInputs = (amount, address) => ({ passphrase, secondPassphrase }) =>
	transactions.transfer({
		recipientId: address,
		amount,
		passphrase,
		secondPassphrase,
	});

export const actionCreator = vorpal => async ({ amount, address, options }) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
		signature,
	} = options;

	validateAddress(address);
	const normalizedAmount = normalizeAmount(amount);
	const processFunction = processInputs(normalizedAmount, address);

	return signature === false
		? processFunction({
				passphrase: null,
				secondPassphrase: null,
			})
		: getInputsFromSources(vorpal, {
				passphrase: {
					source: passphraseSource,
					repeatPrompt: true,
				},
				secondPassphrase: !secondPassphraseSource
					? null
					: {
							source: secondPassphraseSource,
							repeatPrompt: true,
						},
			}).then(processFunction);
};

const createTransactionTransfer = createCommand({
	command: 'create transaction transfer <amount> <address>',
	alias: 'create transaction 0',
	description,
	actionCreator,
	options: [
		commonOptions.noSignature,
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
	],
	errorPrefix: 'Could not create "transfer" transaction',
});

export default createTransactionTransfer;

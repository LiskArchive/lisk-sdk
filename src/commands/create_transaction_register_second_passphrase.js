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
import { createCommand } from '../utils/helpers';
import getInputsFromSources from '../utils/input';
import commonOptions from '../utils/options';
import transactions from '../utils/transactions';

const description = `Creates a transaction which will register a second passphrase for the account if broadcast to the network.

	Examples:
	- create transaction register second passphrase
	- create transaction 1
`;

export const processInputs = () => ({ passphrase, secondPassphrase }) =>
	transactions.registerSecondPassphrase({
		passphrase,
		secondPassphrase,
	});

export const actionCreator = vorpal => async ({ options }) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
		signature,
	} = options;

	const processFunction = processInputs();

	return signature === false
		? getInputsFromSources(vorpal, {
				passphrase: null,
				secondPassphrase: {
					source: secondPassphraseSource,
					repeatPrompt: true,
				},
			}).then(processFunction)
		: getInputsFromSources(vorpal, {
				passphrase: {
					source: passphraseSource,
					repeatPrompt: true,
				},
				secondPassphrase: {
					source: secondPassphraseSource,
					repeatPrompt: true,
				},
			}).then(processFunction);
};

const createTransactionRegisterSecondPassphrase = createCommand({
	command: 'create transaction register second passphrase',
	alias: 'create transaction 1',
	description,
	actionCreator,
	options: [
		commonOptions.noSignature,
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
	],
	errorPrefix: 'Could not create "register second passphrase" transaction',
});

export default createTransactionRegisterSecondPassphrase;

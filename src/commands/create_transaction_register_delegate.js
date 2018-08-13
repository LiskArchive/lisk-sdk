/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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

const description = `Creates a transaction which will register the account as a delegate candidate if broadcast to the network.

	Examples:
	- create transaction register delegate username
	- create transaction 2 username
`;

const processInputs = username => ({ passphrase, secondPassphrase }) =>
	transactions.registerDelegate({
		passphrase,
		secondPassphrase,
		username,
	});

export const actionCreator = vorpal => async ({ username, options }) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
		signature,
	} = options;

	const processFunction = processInputs(username);

	return signature === false
		? processFunction({ passphrase: null, secondPassphrase: null })
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

const createTransactionRegisterDelegate = createCommand({
	command: 'create transaction register delegate <username>',
	alias: 'create transaction 2',
	description,
	actionCreator,
	options: [
		commonOptions.noSignature,
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
	],
	errorPrefix: 'Could not create "register delegate" transaction',
});

export default createTransactionRegisterDelegate;

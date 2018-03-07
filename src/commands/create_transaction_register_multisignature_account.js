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
import {
	createCommand,
	validateLifetime,
	validateMinimum,
	validatePublicKeys,
} from '../utils/helpers';
import getInputsFromSources from '../utils/input';
import commonOptions from '../utils/options';
import transactions from '../utils/transactions';

const description = `Creates a transaction which will register the account as a multisignature account if broadcast to the network, using the following parameters:
	- The lifetime (the number of hours in which the transaction can be signed after being created).
	- The minimum number of distinct signatures required for a transaction to be successfully approved from the multisignature account.
	- A list of one or more public keys that will identify the multisignature group.

	Examples:
	- create transaction register multisignature account 24 2 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca 922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa
	- create transaction 4 24 2 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca 922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa
`;

const processInputs = (lifetime, minimum, keysgroup) => ({
	passphrase,
	secondPassphrase,
}) =>
	transactions.registerMultisignature({
		passphrase,
		secondPassphrase,
		keysgroup,
		lifetime,
		minimum,
	});

export const actionCreator = vorpal => async ({
	lifetime,
	minimum,
	keysgroup,
	options,
}) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
		signature,
	} = options;

	const publicKeys = validatePublicKeys(keysgroup);

	validateLifetime(lifetime);
	validateMinimum(minimum);

	const transactionLifetime = parseInt(lifetime, 10);
	const transactionMinimumConfirmations = parseInt(minimum, 10);
	const processFunction = processInputs(
		transactionLifetime,
		transactionMinimumConfirmations,
		publicKeys,
	);

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

const createTransactionRegisterMultisignatureAccount = createCommand({
	command:
		'create transaction register multisignature account <lifetime> <minimum> <keysgroup...>',
	alias: 'create transaction 4',
	description,
	actionCreator,
	options: [
		commonOptions.noSignature,
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
	],
	errorPrefix: 'Could not create "register multisignature account" transaction',
});

export default createTransactionRegisterMultisignatureAccount;

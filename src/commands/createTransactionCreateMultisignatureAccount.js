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
import { ValidationError } from '../utils/error';
import {
	createCommand,
	validateLifetime,
	validateMinimum,
} from '../utils/helpers';
import getInputsFromSources from '../utils/input';
import commonOptions from '../utils/options';
import transactions from '../utils/transactions';

const description = `Creates a transaction which will register a multisignature account for an existing account if broadcast to the network.
	The transaction command takes three required parameters, keysgroup as a list of public keys that are part of the multisignature group.
	Lifetime as a parameter of how many hours the transaction can be signed.
	Minimum as the amount of signatures needed until the transaction will be processed.

	Examples:
	- create transaction create multisignature account 24 2 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca 922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa
	- create transaction 4 24 2 215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca 922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa
`;

const processInputs = (lifetime, minimum, keysgroup) =>
	({ passphrase, secondPassphrase }) =>
		transactions.createMultisignature(
			passphrase,
			secondPassphrase,
			keysgroup,
			lifetime,
			minimum,
		);

export const actionCreator = vorpal => async ({
	lifetime, minimum, keysgroup, options,
}) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
	} = options;

	const publicKeysWithPlus = keysgroup.map((publicKey) => {
		try {
			Buffer.from(publicKey, 'hex').toString('hex');
		} catch (error) {
			throw new ValidationError(`Error processing public key ${publicKey}: ${error.message}.`);
		}
		if (publicKey.length !== 64) {
			throw new ValidationError(`Public key ${publicKey} length differs from the expected 64 hex characters for a public key.`);
		}
		return `+${publicKey}`;
	});

	validateLifetime(lifetime);
	validateMinimum(minimum);

	const transactionLifetime = parseInt(lifetime, 10);
	const transactionMinimumConfirmations = parseInt(minimum, 10);

	return getInputsFromSources(vorpal, {
		passphrase: {
			source: passphraseSource,
			repeatPrompt: true,
		},
		secondPassphrase: !secondPassphraseSource ? null : {
			source: secondPassphraseSource,
			repeatPrompt: true,
		},
	})
		.then(processInputs(
			transactionLifetime,
			transactionMinimumConfirmations,
			publicKeysWithPlus,
		));
};

const createTransactionRegisterSecondPassphrase = createCommand({
	command: 'create transaction create multisignature account <lifetime> <minimum> <keysgroup...>',
	alias: 'create transaction 4',
	description,
	actionCreator,
	options: [
		commonOptions.passphrase,
		commonOptions.secondPassphrase,
	],
	errorPrefix: 'Could not create "create multisignature group" transaction',
});

export default createTransactionRegisterSecondPassphrase;

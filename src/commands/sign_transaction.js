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
import transactions from '../utils/transactions';
import { ValidationError } from '../utils/error';
import { createCommand } from '../utils/helpers';
import getInputsFromSources from '../utils/input';
import { getStdIn } from '../utils/input/utils';
import commonOptions from '../utils/options';

const description = `Sign a transaction using your secret passphrase.

	Example: sign transaction '{"amount":"100","recipientId":"13356260975429434553L","senderPublicKey":null,"timestamp":52871598,"type":0,"fee":"10000000","recipientPublicKey":null,"asset":{}}'
`;

const getTransactionInput = ({ transaction, stdin }) => {
	const hasStdIn = stdin && stdin[0];
	if (!transaction && !hasStdIn) {
		return null;
	}
	return transaction || stdin[0];
};

const getStdInForNonInteractiveMode = async () => {
	// We should only get normal stdin for NON_INTERACTIVE_MODE
	if (process.env.NON_INTERACTIVE_MODE) {
		const stdin = await getStdIn({ dataIsRequired: true });
		return stdin.data;
	}
	return null;
};

export const actionCreator = vorpal => async ({
	transaction,
	stdin,
	options = {},
}) => {
	const {
		passphrase: passphraseSource,
		'second-passphrase': secondPassphraseSource,
	} = options;
	const transactionSource = getTransactionInput({
		transaction,
		stdin,
	});
	const transactionInput =
		transactionSource || (await getStdInForNonInteractiveMode());

	if (!transactionInput) {
		throw new ValidationError('No transaction was provided.');
	}

	let transactionObject;
	try {
		transactionObject = JSON.parse(transactionInput);
	} catch (error) {
		throw new ValidationError('Could not parse transaction JSON.');
	}

	if (transactionObject.error) {
		throw new Error(transactionObject.error);
	}

	const { passphrase, secondPassphrase } = await getInputsFromSources(vorpal, {
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
	});

	return transactions.utils.prepareTransaction(
		transactionObject,
		passphrase,
		secondPassphrase,
	);
};

const signTransaction = createCommand({
	command: 'sign transaction [transaction]',
	description,
	actionCreator,
	options: [commonOptions.passphrase, commonOptions.secondPassphrase],
	errorPrefix: 'Could not sign transaction',
});

export default signTransaction;

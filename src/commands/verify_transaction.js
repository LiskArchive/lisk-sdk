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
import { getFirstLineFromString } from '../utils/input';
import { getData, getStdIn } from '../utils/input/utils';

const description = `Verifies a transaction has a valid signature.

	Examples:
	- verify transaction '{"type":0,"amount":"100",...}'
	- verify transaction '{"type":0,"amount":"100",...}' --second-public-key 647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6
	- create transaction transfer 100 123L --json | verify transaction
`;

const secondPublicKeyDescription = `Specifies a source for providing a second public key to the command. The second public key must be provided via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.

	Note: if both transaction and second public key are passed via stdin, the transaction must be the first line.

	Examples:
	- --second-public-key file:/path/to/my/message.txt
	- --second-public-key 790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951
`;

const getTransactionInput = ({ transaction, stdin }) => {
	const hasStdIn = stdin && stdin[0];
	if (!transaction && !hasStdIn) {
		return null;
	}
	return transaction || stdin[0];
};

const processSecondPublicKey = async secondPublicKey =>
	secondPublicKey.includes(':') ? getData(secondPublicKey) : secondPublicKey;

const getStdInForNonInteractiveMode = async () => {
	// We should only get normal stdin for NON_INTERACTIVE_MODE
	if (process.env.NON_INTERACTIVE_MODE) {
		const stdin = await getStdIn({ dataIsRequired: true });
		return getFirstLineFromString(stdin.data);
	}
	return null;
};

export const actionCreator = () => async ({
	transaction,
	stdin,
	options = {},
}) => {
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

	const secondPublicKey = options['second-public-key']
		? await processSecondPublicKey(options['second-public-key'])
		: null;

	const verified = transactions.utils.verifyTransaction(
		transactionObject,
		secondPublicKey,
	);
	return {
		verified,
	};
};

const verifyTransaction = createCommand({
	command: 'verify transaction [transaction]',
	description,
	actionCreator,
	options: [['--second-public-key <source>', secondPublicKeyDescription]],
	errorPrefix: 'Could not verify transaction',
});

export default verifyTransaction;

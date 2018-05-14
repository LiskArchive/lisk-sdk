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
import transactions from '../utils/transactions';
import { FileSystemError, ValidationError } from '../utils/error';
import { createCommand } from '../utils/helpers';
import { getData } from '../utils/input/utils';

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

const getTransactionInput = ({ transaction, stdin, shouldUseStdIn }) => {
	const hasStdIn = stdin && stdin[0];
	if (shouldUseStdIn && !hasStdIn) {
		throw new ValidationError('No transaction was provided.');
	}
	return shouldUseStdIn ? stdin[0] : transaction;
};

export const actionCreator = () => async ({
	transaction,
	stdin,
	options = {},
}) => {
	const shouldUseStdIn = !transaction;
	const transactionInput = getTransactionInput({
		transaction,
		stdin,
		shouldUseStdIn,
	});
	let transactionObject;
	try {
		transactionObject = JSON.parse(transactionInput);
	} catch (error) {
		throw new ValidationError('Could not parse transaction JSON.');
	}

	const secondPublicKeyInput = options['second-public-key'];

	return getData(secondPublicKeyInput)
		.catch(error => {
			if (error instanceof FileSystemError) {
				throw error;
			}
			return null;
		})
		.then(secondPublicKey => {
			const verified = transactions.utils.verifyTransaction(
				transactionObject,
				secondPublicKey,
			);
			return {
				verified,
			};
		});
};

const verifyTransaction = createCommand({
	command: 'verify transaction [transaction]',
	description,
	actionCreator,
	options: [['--second-public-key <source>', secondPublicKeyDescription]],
	errorPrefix: 'Could not verify transaction',
});

export default verifyTransaction;

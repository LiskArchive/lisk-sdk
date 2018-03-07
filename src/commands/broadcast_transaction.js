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
import getAPIClient from '../utils/api';
import { ValidationError } from '../utils/error';
import { createCommand } from '../utils/helpers';

const description = `Broadcasts a transaction to the network via the node
specified in the current config. Accepts a stringified JSON transaction as an
argument, or a transaction can be piped from a previous command. If piping in
non-interactive mode make sure to quote out the entire command chain to avoid
piping-related conflicts in your shell.

	Examples:
	- Interactive mode:
		- broadcast transaction '{"type":0,"amount":"100",...}'
		- create transaction transfer 100 13356260975429434553L --json | broadcast transaction
	- Non-interactive mode:
		- lisk-commander "create transaction transfer 100 13356260975429434553L --json | broadcast transaction"
`;

const getTransactionInput = ({ transaction, stdin, shouldUseStdIn }) => {
	const hasStdIn = stdin && stdin[0];
	if (shouldUseStdIn && !hasStdIn) {
		throw new ValidationError('No transaction was provided.');
	}
	return shouldUseStdIn ? stdin[0] : transaction;
};

export const actionCreator = () => async ({ transaction, stdin }) => {
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
		throw new ValidationError(
			'Could not parse transaction JSON. Did you use the `--json` option?',
		);
	}

	return shouldUseStdIn && transactionObject.error
		? transactionObject
		: getAPIClient().transactions.broadcast(transactionObject);
};

const broadcastTransaction = createCommand({
	command: 'broadcast transaction [transaction]',
	description,
	actionCreator,
	errorPrefix: 'Could not broadcast transaction',
});

export default broadcastTransaction;

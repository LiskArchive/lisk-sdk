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
import { COMMAND_TYPES } from '../utils/constants';
import { createCommand, deAlias } from '../utils/helpers';
import query from '../utils/query';

const description = `Get information from <type> with parameter <input>. Types available: account, address, block, delegate, transaction.

	Examples:
	- get delegate lightcurve
	- get block 5510510593472232540
`;

export const handlers = {
	account: account => query.isAccountQuery(account),
	address: address => query.isAccountQuery(address),
	block: block => query.isBlockQuery(block),
	delegate: delegate => query.isDelegateQuery(delegate),
	transaction: transaction => query.isTransactionQuery(transaction),
};

export const processResult = type => result => (
	result.error
		? result
		: result[deAlias(type)]
);

const actionCreator = () => async ({ type, input }) => {
	if (!COMMAND_TYPES.includes(type)) {
		throw new Error('Unsupported type.');
	}

	return handlers[type](input)
		.then(processResult(type));
};

const get = createCommand({
	command: 'get <type> <input>',
	autocomplete: COMMAND_TYPES,
	description,
	actionCreator,
	errorPrefix: 'Could not get',
});

export default get;

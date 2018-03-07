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
import { COMMAND_TYPES, PLURALS, QUERY_INPUT_MAP } from '../utils/constants';
import { ValidationError } from '../utils/error';
import { createCommand, deAlias } from '../utils/helpers';
import query from '../utils/query';

const description = `Gets an array of information from the blockchain. Types available: accounts, addresses, blocks, delegates, transactions.

	Examples:
	- list delegates lightcurve tosch
	- list blocks 5510510593472232540 16450842638530591789
`;

export const actionCreator = () => async ({ type, inputs }) => {
	const pluralType = Object.keys(PLURALS).includes(type) ? PLURALS[type] : type;

	if (!COMMAND_TYPES.includes(pluralType)) {
		throw new ValidationError('Unsupported type.');
	}

	const endpoint = deAlias(pluralType);

	const queries = inputs.map(input => {
		const req = {
			limit: 1,
			[QUERY_INPUT_MAP[endpoint]]: input,
		};
		return query(endpoint, req);
	});

	return Promise.all(queries);
};

const list = createCommand({
	command: 'list <type> <inputs...>',
	autocomplete: COMMAND_TYPES,
	description,
	actionCreator,
	errorPrefix: 'Could not list',
});

export default list;

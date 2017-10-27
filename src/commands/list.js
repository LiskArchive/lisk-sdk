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
import {
	COMMAND_TYPES,
	SINGULARS,
} from '../utils/constants';
import {
	createCommand,
	deAlias,
	processQueryResult,
} from '../utils/helpers';
import query from '../utils/query';

const description = `Get information from <type> with parameters <input, input, ...>. Types available: accounts, addresses, blocks, delegates, transactions.

	Examples:
	- list delegates lightcurve tosch
	- list blocks 5510510593472232540 16450842638530591789
`;

export const actionCreator = () => async ({ type, inputs }) => {
	const singularType = Object.keys(SINGULARS).includes(type)
		? SINGULARS[type]
		: type;

	if (!COMMAND_TYPES.includes(singularType)) {
		throw new Error('Unsupported type.');
	}

	const queries = inputs.map(query.handlers[deAlias(singularType)]);

	return Promise.all(queries)
		.then(results => results.map(processQueryResult(singularType)));
};

const list = createCommand({
	command: 'list <type> <inputs...>',
	autocomplete: COMMAND_TYPES,
	description,
	actionCreator,
	errorPrefix: 'Could not list',
});

export default list;

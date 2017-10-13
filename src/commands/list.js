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
import { createCommand } from '../utils/helpers';
import { handlers, processResult } from './get';

const description = `Get information from <type> with parameters <input, input, ...>. Types available: accounts, addresses, blocks, delegates, transactions.

	Examples:
		- list delegates lightcurve tosch
		- list blocks 5510510593472232540 16450842638530591789
`;

const actionCreator = () => async ({ type, variadic }) => {
	const singularType = Object.keys(SINGULARS).includes(type)
		? SINGULARS[type]
		: type;

	if (!COMMAND_TYPES.includes(singularType)) {
		throw new Error('Unsupported type.');
	}

	const queries = variadic.map(handlers[singularType]);

	return Promise.all(queries)
		.then(results => results.map(processResult(singularType)));
};

const list = createCommand({
	command: 'list <type> <variadic...>',
	autocomplete: COMMAND_TYPES,
	description,
	actionCreator,
	errorPrefix: 'Could not list',
});

export default list;

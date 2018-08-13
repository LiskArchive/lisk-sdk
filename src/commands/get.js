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
import { COMMAND_TYPES, PLURALS, QUERY_INPUT_MAP } from '../utils/constants';
import { ValidationError } from '../utils/error';
import { createCommand, deAlias } from '../utils/helpers';
import query from '../utils/query';

const description = `Gets information from the blockchain. Types available: account, address, block, delegate, transaction.

	Examples:
	- get delegate lightcurve
	- get block 5510510593472232540
`;

export const actionCreator = () => async ({ type, input }) => {
	const pluralType = Object.keys(PLURALS).includes(type) ? PLURALS[type] : type;

	if (!COMMAND_TYPES.includes(pluralType)) {
		throw new ValidationError('Unsupported type.');
	}

	const endpoint = deAlias(pluralType);
	const req = {
		limit: 1,
		[QUERY_INPUT_MAP[endpoint]]: input,
	};

	return query(endpoint, req);
};

const get = createCommand({
	command: 'get <type> <input>',
	autocomplete: COMMAND_TYPES,
	description,
	actionCreator,
	errorPrefix: 'Could not get',
});

export default get;

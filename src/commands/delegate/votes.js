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
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import getAPIClient from '../../utils/api';
import query from '../../utils/query';
import { SORT_FIELDS } from '../../utils/constants';

const processFlagInputs = (limitStr, offsetStr, sortStr) => {
	const limit = parseInt(limitStr, 10);
	const offset = parseInt(offsetStr, 10);
	const sort = sortStr ? sortStr.trim() : undefined;
	if (limitStr !== limit.toString() || !Number.isInteger(limit) || limit <= 0) {
		throw new Error('Limit must be an integer and greater than 0');
	}
	if (
		offsetStr !== offset.toString() ||
		!Number.isInteger(offset) ||
		offset < 0
	) {
		throw new Error('Offset must be an integer and greater than or equal to 0');
	}
	if (SORT_FIELDS.indexOf(sort) === -1) {
		throw new Error(`Sort must be one of: ${SORT_FIELDS.join(', ')}`);
	}

	return {
		limit,
		offset,
		sort,
	};
};

export default class VotesCommand extends BaseCommand {
	async run() {
		const {
			args: { usernames },
			flags: { limit: limitStr, offset: offsetStr, sort: sortStr },
		} = this.parse(VotesCommand);

		const { limit, offset, sort } = processFlagInputs(
			limitStr,
			offsetStr,
			sortStr,
		);

		const req = usernames.map(username => ({
			query: {
				username,
				limit: limit || 10,
				offset: offset || 0,
				sort: sort || 'balance:desc',
			},
			placeholder: {
				username,
				message: 'Delegate not found.',
			},
		}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'votes', req);
		this.print(results);
	}
}

VotesCommand.args = [
	{
		name: 'usernames',
		required: true,
		description: 'Comma-separated username(s) to get information about.',
		parse: input => input.split(',').filter(Boolean),
	},
];

VotesCommand.flags = {
	...BaseCommand.flags,
	limit: flagParser.string({
		description: 'Limit applied to results.',
		default: '10',
	}),
	offset: flagParser.string({
		description: 'Offset applied to results.',
		default: '0',
	}),
	sort: flagParser.string({
		description: 'Fields to sort results by.',
		default: 'balance:desc',
	}),
};

VotesCommand.description = `
Gets votes information for given delegate(s) from the blockchain.
`;

VotesCommand.examples = [
	'delegate:votes lightcurve',
	'delegate:votes lightcurve,4miners.net',
	'delegate:votes lightcurve,4miners.net --limit 20 --offset 5 --sort publicKey:asc --pretty',
];

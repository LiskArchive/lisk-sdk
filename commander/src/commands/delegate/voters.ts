/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { getAPIClient } from '../../utils/api';
import { SORT_FIELDS } from '../../utils/constants';
import { query } from '../../utils/query';

interface Args {
	readonly usernames: string;
}

interface QueryParameters {
	readonly limit: number;
	readonly offset: number;
	readonly sort?: string;
}

const MAXIMUM_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const DEFAULT_OFFSET = 0;
const DEFAULT_SORT = 'balance:desc';

const processFlagInputs = (
	limitStr: string,
	offsetStr: string,
	sortStr: string,
): QueryParameters => {
	const limit = parseInt(limitStr, 10);
	const offset = parseInt(offsetStr, 10);
	const sort = sortStr ? sortStr.trim() : undefined;
	if (limitStr !== limit.toString() || !Number.isInteger(limit) || limit <= 0) {
		throw new Error('Limit must be an integer and greater than 0');
	}
	if (limit && limit > MAXIMUM_LIMIT) {
		throw new Error(`Maximum limit amount is ${MAXIMUM_LIMIT}`);
	}
	if (
		offsetStr !== offset.toString() ||
		!Number.isInteger(offset) ||
		offset < 0
	) {
		throw new Error('Offset must be an integer and greater than or equal to 0');
	}
	if (sort !== undefined && !SORT_FIELDS.includes(sort)) {
		throw new Error(`Sort must be one of: ${SORT_FIELDS.join(', ')}`);
	}

	return {
		limit,
		offset,
		sort,
	};
};

export default class VotersCommand extends BaseCommand {
	static args = [
		{
			name: 'usernames',
			required: true,
			description: 'Comma-separated username(s) to get information about.',
		},
	];

	static description = `
	Gets voters information for given delegate(s) from the blockchain.
	`;

	static examples = [
		'delegate:voters lightcurve',
		'delegate:voters lightcurve,4miners.net',
		'delegate:voters lightcurve,4miners.net --limit 20 --offset 5 --sort publicKey:asc --pretty',
	];

	static flags = {
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
			default: DEFAULT_SORT,
		}),
	};

	async run(): Promise<void> {
		const {
			args,
			flags: { limit: limitStr, offset: offsetStr, sort: sortStr },
		} = this.parse(VotersCommand);
		const { usernames: usernamesStr }: Args = args;

		const usernames = usernamesStr.split(',').filter(Boolean);

		const { limit, offset, sort } = processFlagInputs(
			limitStr as string,
			offsetStr as string,
			sortStr as string,
		);

		const req = usernames.map(username => ({
			query: {
				username,
				limit: limit || DEFAULT_LIMIT,
				offset: offset || DEFAULT_OFFSET,
				sort: sort || DEFAULT_SORT,
			},
			placeholder: {
				username,
				message: 'Delegate not found.',
			},
		}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'voters', req);
		this.print(results);
	}
}

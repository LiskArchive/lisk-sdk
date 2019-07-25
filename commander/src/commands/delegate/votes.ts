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
	readonly addresses: string;
}

const MAXIMUM_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const DEFAULT_OFFSET = 0;
const DEFAULT_SORT = 'balance:desc';

const VOTES_SORT_FIELDS = SORT_FIELDS.filter(
	field => !field.includes('publicKey'),
);

const processFlagInputs = (
	limitStr: string,
	offsetStr: string,
	sortStr: string,
) => {
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
	if (sort && !VOTES_SORT_FIELDS.includes(sort)) {
		throw new Error(`Sort must be one of: ${VOTES_SORT_FIELDS.join(', ')}`);
	}

	return {
		limit,
		offset,
		sort,
	};
};

export default class VotesCommand extends BaseCommand {
	static args = [
		{
			name: 'addresses',
			required: true,
			description: 'Comma-separated address(es) to get information about.',
		},
	];

	static description = `
	Gets votes information for given account(s) from the blockchain.
	`;

	static examples = [
		'delegate:votes 13133549779353512613L',
		'delegate:votes 13133549779353512613L,16010222169256538112L',
		'delegate:votes 13133549779353512613L,16010222169256538112L --limit 20 --offset 5 --sort balance:asc --pretty',
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
		} = this.parse(VotesCommand);

		const { addresses: addressesStr }: Args = args;
		const addresses = addressesStr.split(',').filter(Boolean);
		const { limit, offset, sort } = processFlagInputs(
			limitStr as string,
			offsetStr as string,
			sortStr as string,
		);

		const req = addresses.map(address => ({
			query: {
				address,
				limit: limit || DEFAULT_LIMIT,
				offset: offset || DEFAULT_OFFSET,
				sort: sort || DEFAULT_SORT,
			},
			placeholder: {
				address,
				message: 'Account not found.',
			},
		}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'votes', req);
		this.print(results);
	}
}

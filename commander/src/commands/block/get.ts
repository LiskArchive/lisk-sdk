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
import BaseCommand from '../../base';
import { getAPIClient } from '../../utils/api';
import { query } from '../../utils/query';

interface Args {
	readonly blockIds: string;
}

export default class GetCommand extends BaseCommand {
	static args = [
		{
			name: 'blockIds',
			required: true,
			description: 'Comma-separated block ID(s) to get information about.',
		},
	];

	static description = `
		Gets block information from the blockchain.
	`;

	static examples = [
		'block:get 17108498772892203620',
		'block:get 17108498772892203620,8541428004955961162',
	];

	static flags = {
		...BaseCommand.flags,
	};

	async run(): Promise<void> {
		const { args } = this.parse(GetCommand);
		const { blockIds: blockIdsStr }: Args = args;
		const blockIds = blockIdsStr.split(',').filter(Boolean);
		const req = blockIds.map((blockId: string) => ({
			query: {
				limit: 1,
				blockId,
			},
			placeholder: {
				id: blockId,
				message: 'Block not found.',
			},
		}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'blocks', req);
		this.print(results);
	}
}

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
	readonly usernames: string;
}

export default class GetCommand extends BaseCommand {
	static args = [
		{
			name: 'usernames',
			required: true,
			description: 'Comma-separated username(s) to get information about.',
		},
	];

	static description = `
	Gets delegate information from the blockchain.
	`;

	static examples = [
		'delegate:get lightcurve',
		'delegate:get lightcurve,4miners.net',
	];

	static flags = {
		...BaseCommand.flags,
	};

	async run(): Promise<void> {
		const { args } = this.parse(GetCommand);
		const { usernames: usernamesStr }: Args = args;
		const usernames: ReadonlyArray<string> = usernamesStr
			.split(',')
			.filter(Boolean);
		const req = usernames.map(username => ({
			query: {
				limit: 1,
				username,
			},
			placeholder: {
				username,
				message: 'Delegate not found.',
			},
		}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'delegates', req);
		this.print(results);
	}
}

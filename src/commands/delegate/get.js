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
import BaseCommand from '../../base';
import getAPIClient from '../../utils/api';
import query from '../../utils/query';

export default class GetCommand extends BaseCommand {
	async run() {
		const { args: { usernames } } = this.parse(GetCommand);
		const req = usernames.map(username => ({
			limit: 1,
			username,
		}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'delegates', req);
		this.print(results);
	}
}

GetCommand.args = [
	{
		name: 'usernames',
		required: true,
		description:
			'Comma separated username(s) which you want to get the information of.',
		parse: input => input.split(','),
	},
];

GetCommand.flags = {
	...BaseCommand.flags,
};

GetCommand.description = `
Gets delegate information from the blockchain.
`;

GetCommand.examples = [
	'delegate:get lightcurve',
	'delegate:get lightcurve,4miners.net',
];

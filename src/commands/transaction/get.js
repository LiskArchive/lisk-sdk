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
		const { args: { ids } } = this.parse(GetCommand);
		const req = ids.map(id => ({
			query: {
				limit: 1,
				id,
			},
			placeholder: {
				id,
				message: 'Transaction not found.',
			},
		}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'transactions', req);
		this.print(results);
	}
}

GetCommand.args = [
	{
		name: 'ids',
		required: true,
		description: 'Comma-separated transaction ID(s) to get information about.',
		parse: input => input.split(',').filter(Boolean),
	},
];

GetCommand.flags = {
	...BaseCommand.flags,
};

GetCommand.description = `
Gets transaction information from the blockchain.
`;

GetCommand.examples = [
	'transaction:get 10041151099734832021',
	'transaction:get 10041151099734832021,1260076503909567890',
];

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
		const { args: { blockIds } } = this.parse(GetCommand);
		const req =
			blockIds.length === 1
				? { limit: 1, blockId: blockIds[0] }
				: blockIds.map(blockId => ({
						limit: 1,
						blockId,
					}));
		const client = getAPIClient(this.userConfig.api);
		const results = await query(client, 'blocks', req);
		this.print(results);
	}
}

GetCommand.args = [
	{
		name: 'blockIds',
		required: true,
		description:
			'Comma separated block id(s) which you want to get the information of.',
		parse: input => input.split(','),
	},
];

GetCommand.flags = {
	...BaseCommand.flags,
};

GetCommand.description = `
Gets block information from the blockchain.
`;

GetCommand.examples = [
	'block:get 17108498772892203620',
	'block:get 17108498772892203620,8541428004955961162',
];

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
import { query, handleResponse } from '../../utils/query';

const TRANSACTION_STATES = ['unsigned', 'unprocessed'];

const stateFlag = {
	char: 's',
	options: TRANSACTION_STATES,
	description: `Get transactions based on a given state. Possible values for the state are 'unsigned' and 'unprocessed'.
	Examples:
	- --state=unsigned
	- --state=unprocessed
`,
};

const queryNode = async (client, txnState, parameters) =>
	Promise.all(
		parameters.map(param =>
			client
				.getTransactions(txnState, param.query)
				.then(res =>
					handleResponse('node/transactions', res, param.placeholder),
				),
		),
	);

export default class GetCommand extends BaseCommand {
	async run() {
		const { args: { ids }, flags: { state: txnState } } = this.parse(
			GetCommand,
		);
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

		if (txnState && txnState === 'unsigned') {
			const results = await queryNode(client.node, txnState, req);
			return this.print(results);
		}
		if (txnState && txnState === 'unprocessed') {
			const results = await queryNode(client.node, txnState, req);
			return this.print(results);
		}
		const results = await query(client, 'transactions', req);

		return this.print(results);
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
	state: flagParser.string(stateFlag),
};

GetCommand.description = `
Gets transaction information from the blockchain.
`;

GetCommand.examples = [
	'transaction:get 10041151099734832021',
	'transaction:get 10041151099734832021,1260076503909567890',
	'transaction:get 10041151099734832021,1260076503909567890 --state=unprocessed',
];

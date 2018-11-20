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
const SORT_OPTIONS = [
	'amount:asc',
	'amount:desc',
	'fee:asc',
	'fee:desc',
	'type:asc',
	'type:desc',
	'timestamp:asc',
	'timestamp:desc',
];

const senderIdFlag = {
	description: `Get transactions based by sender-id which is sender's lisk address'.
	Examples:
	- --sender-id=12668885769632475474L
`,
};
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
		const {
			args: { ids },
			flags: {
				limit,
				offset,
				sort,
				'sender-id': senderAddress,
				state: txnState,
			},
		} = this.parse(GetCommand);

		const client = getAPIClient(this.userConfig.api);

		if (txnState && senderAddress && ids) {
			const reqTxnSenderId = ids.map(id => ({
				query: {
					limit: 1,
					id,
					senderId: senderAddress,
				},
				placeholder: {
					id,
					senderId: senderAddress,
					message: 'Transaction not found.',
				},
			}));

			const results = await queryNode(client.node, txnState, reqTxnSenderId);

			return this.print(results);
		}

		if (txnState && ids) {
			const reqTransactionIDs = ids.map(id => ({
				query: {
					limit: 1,
					id,
				},
				placeholder: {
					id,
					message: 'Transaction not found.',
				},
			}));

			const results = await queryNode(client.node, txnState, reqTransactionIDs);

			return this.print(results);
		}
		if (txnState && senderAddress) {
			const reqWithSenderId = [
				{
					query: {
						limit,
						offset,
						sort,
						senderId: senderAddress,
					},
					placeholder: {
						senderId: senderAddress,
						message: 'Transaction not found.',
					},
				},
			];

			const results = await queryNode(client.node, txnState, reqWithSenderId);

			return this.print(results);
		}

		if (txnState) {
			const reqByLimitOffset = [
				{
					query: {
						limit,
						offset,
						sort,
					},
					placeholder: {
						message: 'No transactions found.',
					},
				},
			];

			const results = await queryNode(client.node, txnState, reqByLimitOffset);

			return this.print(results);
		}

		if (ids) {
			const reqTransactionIDs = ids.map(id => ({
				query: {
					limit: 1,
					id,
				},
				placeholder: {
					id,
					message: 'Transaction not found.',
				},
			}));
			const results = await query(client, 'transactions', reqTransactionIDs);

			return this.print(results);
		}

		if (senderAddress) {
			const reqSenderId = {
				query: {
					limit,
					offset,
					sort,
					senderId: senderAddress,
				},
				placeholder: {
					message: 'No transactions found.',
				},
			};
			const results = await query(client, 'transactions', reqSenderId);

			return this.print(results);
		}

		const req = {
			query: {
				limit,
				offset,
				sort,
			},
			placeholder: {
				message: 'No transactions found.',
			},
		};
		const results = await query(client, 'transactions', req);

		if (!Array.isArray(results)) {
			return this.print(results);
		}

		return this.print(results);
	}
}

GetCommand.args = [
	{
		name: 'ids',
		required: false,
		description: 'Comma-separated transaction ID(s) to get information about.',
		parse: input => input.split(',').filter(Boolean),
	},
];

GetCommand.flags = {
	...BaseCommand.flags,
	state: flagParser.string(stateFlag),
	'sender-id': flagParser.string(senderIdFlag),
	limit: flagParser.string({
		description:
			'Limits the returned transactions array by specified integer amount. Maximum is 100.',
		default: '10',
	}),
	offset: flagParser.string({
		description:
			'Offsets the returned transactions array by specified integer amount.',
		default: '0',
	}),
	sort: flagParser.string({
		description: 'Fields to sort results by.',
		default: 'timestamp:desc',
		options: SORT_OPTIONS,
	}),
};

GetCommand.description = `
Gets transaction information from the blockchain.
`;

GetCommand.examples = [
	'transaction:get 10041151099734832021',
	'transaction:get 10041151099734832021,1260076503909567890',
	'transaction:get 10041151099734832021,1260076503909567890 --state=unprocessed',
	'transaction:get --state=unsigned --sender-id=1813095620424213569L',
	'transaction:get 10041151099734832021 --state=unsigned --sender-id=1813095620424213569L',
	'transaction:get --sender-id=1813095620424213569L',
	'transaction:get --limit=10 --sort=amount:desc',
	'transaction:get --limit=10 --offset=5',
];

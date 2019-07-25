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
import { AlphabetLowercase } from '../../utils/flags';
import { query, queryNodeTransaction } from '../../utils/query';

interface Args {
	readonly ids?: string;
}

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
	char: 's' as AlphabetLowercase,
	options: TRANSACTION_STATES,
	description: `Get transactions based on a given state. Possible values for the state are 'unsigned' and 'unprocessed'.
	Examples:
	- --state=unsigned
	- --state=unprocessed
`,
};

export default class GetCommand extends BaseCommand {
	static args = [
		{
			name: 'ids',
			required: false,
			description:
				'Comma-separated transaction ID(s) to get information about.',
		},
	];

	static description = `
	Gets transaction information from the blockchain.
	`;

	static examples = [
		'transaction:get 10041151099734832021',
		'transaction:get 10041151099734832021,1260076503909567890',
		'transaction:get 10041151099734832021,1260076503909567890 --state=unprocessed',
		'transaction:get --state=unsigned --sender-id=1813095620424213569L',
		'transaction:get 10041151099734832021 --state=unsigned --sender-id=1813095620424213569L',
		'transaction:get --sender-id=1813095620424213569L',
		'transaction:get --limit=10 --sort=amount:desc',
		'transaction:get --limit=10 --offset=5',
	];

	static flags = {
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

	async run(): Promise<void> {
		const {
			args,
			flags: {
				limit,
				offset,
				sort,
				'sender-id': senderAddress,
				state: txnState,
			},
		} = this.parse(GetCommand);
		const { ids: idsStr }: Args = args;
		const ids = idsStr ? idsStr.split(',').filter(Boolean) : undefined;

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

			const stateSenderIdsResult = await queryNodeTransaction(
				client.node,
				txnState,
				reqTxnSenderId,
			);
			this.print(stateSenderIdsResult);

			return;
		}

		if (txnState && ids) {
			const reqTransactionIds = ids.map(id => ({
				query: {
					limit: 1,
					id,
				},
				placeholder: {
					id,
					message: 'Transaction not found.',
				},
			}));

			const txnStateIdsResult = await queryNodeTransaction(
				client.node,
				txnState,
				reqTransactionIds,
			);
			this.print(txnStateIdsResult);

			return;
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

			const txnStateSenderResult = await queryNodeTransaction(
				client.node,
				txnState,
				reqWithSenderId,
			);
			this.print(txnStateSenderResult);

			return;
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

			const txnStateResult = await queryNodeTransaction(
				client.node,
				txnState,
				reqByLimitOffset,
			);
			this.print(txnStateResult);

			return;
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
			const idsResult = await query(client, 'transactions', reqTransactionIDs);
			this.print(idsResult);

			return;
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
			const senderAddressResult = await query(
				client,
				'transactions',
				reqSenderId,
			);
			this.print(senderAddressResult);

			return;
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
		const defaultResults = await query(client, 'transactions', req);

		this.print(defaultResults);
	}
}

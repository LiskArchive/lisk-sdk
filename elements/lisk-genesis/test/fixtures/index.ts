/*
 * Copyright © 2020 Lisk Foundation
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
 */

import { Account, getAccountSchemaAndDefault } from '@liskhq/lisk-chain';
import { GenesisBlockParams } from '../../src';

const delegates = [
	{
		address: 'JdTB7S2iS6hWuJTCCRiPcODKq24=',
		token: { balance: 2874239947 },
		dpos: { delegate: { username: 'ef374a2e8fb9934ad1db0fd5346eb7' } },
	},
	{
		address: 'I3C6mEUeH/AHAp8eYC4Uuwl7UW8=',
		token: { balance: 2620126571 },
		dpos: { delegate: { username: '13462f8e59880cfde6280d34dfd044' } },
	},
	{
		address: 'NLPa3tVQ9bDFCUfY4XdiuXMM8fk=',
		token: { balance: 2384412768 },
		dpos: { delegate: { username: '920cc701231b2f8c624d4bc8f4c267' } },
	},
	{
		address: 'NyudB23TfnwYPPbtA8F92M3A0xI=',
		token: { balance: 28138131 },
		dpos: { delegate: { username: '4a1076aa54533dce1c9b7ed51c509b' } },
	},
	{
		address: 'bjWFsRdRQjpy61tJ9XlAvlCQR1c=',
		token: { balance: 2165380961 },
		dpos: { delegate: { username: '98beeddc903498ed7cdd36b417b40f' } },
	},
];

const accounts = [
	{
		address: '3t+9TGoa0e8NepXNaQcRRUjYxtg=',
		token: { balance: 653021139 },
	},
	{
		address: 'w8MHF05a4wHElDlsD9tjB+xOxgw=',
		token: { balance: 1966001160 },
	},
	{
		address: 'gOCNMiwktTKaJXxbG9dXgDLTuSE=',
		token: { balance: 3116632800 },
	},
	{
		address: 'wBi13X2ktre/Tmxojo1+mEHUqo8=',
		token: { balance: 2910960211 },
	},
	{
		address: 'UsldJKfqQ9IC2ooNp/CMM6TrbVw=',
		token: { balance: 4218444994 },
	},
	{
		address: 'TJUT73sLzO4CRVlHRwCq1wN3BDs=',
		token: { balance: 476696623 },
	},
	{
		address: 'nTSmlVHYuF7A9VLWXqjdNXJN7pA=',
		token: { balance: 4056778033 },
	},
	{
		address: 'w8Y2FSQEMyXoq86MwfiZ4sL/2bA=',
		token: { balance: 3756324977 },
	},
	{
		address: '2fvbTyL6pgk2oBE0V9oBnrYcPXc=',
		token: { balance: 489340925 },
	},
	{
		address: 'YhUMz5HMFjT5MO7Qt3YPQhdSppg=',
		token: { balance: 1340967959 },
	},
];

const prepareAccounts = (
	data: {
		address: string;
		token: { balance: number };
	}[],
): Account[] => {
	return data.map(acc => ({
		address: Buffer.from(acc.address, 'base64'),
		token: { balance: BigInt(acc.token.balance) },
	}));
};

export const validAccounts = prepareAccounts(accounts);

export const validDelegateAccounts = prepareAccounts(delegates);

export const defaultAccountModules = {
	token: {
		type: 'object',
		fieldNumber: 2,
		properties: {
			balance: {
				fieldNumber: 1,
				dataType: 'uint64',
			},
		},
		default: {
			balance: BigInt(0),
		},
	},
	dpos: {
		type: 'object',
		fieldNumber: 5,
		properties: {
			delegate: {
				type: 'object',
				fieldNumber: 1,
				properties: {
					username: { dataType: 'string', fieldNumber: 1 },
					pomHeights: {
						type: 'array',
						items: { dataType: 'uint32' },
						fieldNumber: 2,
					},
					consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
					lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
					isBanned: { dataType: 'boolean', fieldNumber: 5 },
					totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
				},
				required: [
					'username',
					'pomHeights',
					'consecutiveMissedBlocks',
					'lastForgedHeight',
					'isBanned',
					'totalVotesReceived',
				],
			},
			sentVotes: {
				type: 'array',
				fieldNumber: 2,
				items: {
					type: 'object',
					properties: {
						delegateAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
						},
						amount: {
							dataType: 'uint64',
							fieldNumber: 2,
						},
					},
					required: ['delegateAddress', 'amount'],
				},
			},
			unlocking: {
				type: 'array',
				fieldNumber: 3,
				items: {
					type: 'object',
					properties: {
						delegateAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
						},
						amount: {
							dataType: 'uint64',
							fieldNumber: 2,
						},
						unvoteHeight: {
							dataType: 'uint32',
							fieldNumber: 3,
						},
					},
					required: ['delegateAddress', 'amount', 'unvoteHeight'],
				},
			},
		},
		default: {
			delegate: {
				username: '',
				pomHeights: [],
				consecutiveMissedBlocks: 0,
				lastForgedHeight: 0,
				isBanned: false,
				totalVotesReceived: BigInt(0),
			},
			sentVotes: [],
			unlocking: [],
		},
	},
};

export const { schema: defaultAccountSchema } = getAccountSchemaAndDefault(defaultAccountModules);

export const validGenesisBlockParams = {
	initRounds: 5,
	height: 5,
	timestamp: 1591873718,
	previousBlockID: Buffer.from('RUaQocN4ODJgB1GafOHIpqSV31CJjx69adIvvO35aJo=', 'base64'),
	roundLength: 103,
	initDelegates: validDelegateAccounts.map(a => a.address),
	accounts: [...validAccounts, ...validDelegateAccounts] as Account[],
	accountAssetSchemas: defaultAccountModules,
} as GenesisBlockParams;

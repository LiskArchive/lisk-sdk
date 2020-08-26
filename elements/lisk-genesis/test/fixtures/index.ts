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

import { Account, getAccountSchemaWithDefault } from '@liskhq/lisk-chain';
import { GenesisBlockParams } from '../../src';

const delegates = [
	{
		address: '25d4c1ed2da24ba856b894c209188f70e0caab6e',
		token: { balance: 2874239947 },
		dpos: { delegate: { username: 'ef374a2e8fb9934ad1db0fd5346eb7' } },
	},
	{
		address: '2370ba98451e1ff007029f1e602e14bb097b516f',
		token: { balance: 2620126571 },
		dpos: { delegate: { username: '13462f8e59880cfde6280d34dfd044' } },
	},
	{
		address: '34b3daded550f5b0c50947d8e17762b9730cf1f9',
		token: { balance: 2384412768 },
		dpos: { delegate: { username: '920cc701231b2f8c624d4bc8f4c267' } },
	},
	{
		address: '372b9d076dd37e7c183cf6ed03c17dd8cdc0d312',
		token: { balance: 28138131 },
		dpos: { delegate: { username: '4a1076aa54533dce1c9b7ed51c509b' } },
	},
	{
		address: '6e3585b11751423a72eb5b49f57940be50904757',
		token: { balance: 2165380961 },
		dpos: { delegate: { username: '98beeddc903498ed7cdd36b417b40f' } },
	},
];

const accounts = [
	{
		address: 'dedfbd4c6a1ad1ef0d7a95cd6907114548d8c6d8',
		token: { balance: 653021139 },
	},
	{
		address: 'c3c307174e5ae301c494396c0fdb6307ec4ec60c',
		token: { balance: 1966001160 },
	},
	{
		address: '80e08d322c24b5329a257c5b1bd7578032d3b921',
		token: { balance: 3116632800 },
	},
	{
		address: 'c018b5dd7da4b6b7bf4e6c688e8d7e9841d4aa8f',
		token: { balance: 2910960211 },
	},
	{
		address: '52c95d24a7ea43d202da8a0da7f08c33a4eb6d5c',
		token: { balance: 4218444994 },
	},
	{
		address: '4c9513ef7b0bccee024559474700aad70377043b',
		token: { balance: 476696623 },
	},
	{
		address: '9d34a69551d8b85ec0f552d65ea8dd35724dee90',
		token: { balance: 4056778033 },
	},
	{
		address: 'c3c6361524043325e8abce8cc1f899e2c2ffd9b0',
		token: { balance: 3756324977 },
	},
	{
		address: 'd9fbdb4f22faa60936a0113457da019eb61c3d77',
		token: { balance: 489340925 },
	},
	{
		address: '62150ccf91cc1634f930eed0b7760f421752a698',
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
		address: Buffer.from(acc.address, 'hex'),
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

const { default: defaultAccount, ...defaultAccountSchema } = getAccountSchemaWithDefault(
	defaultAccountModules,
);

export { defaultAccountSchema };

export const validGenesisBlockParams = {
	initRounds: 5,
	height: 5,
	timestamp: 1591873718,
	previousBlockID: Buffer.from(
		'454690a1c37838326007519a7ce1c8a6a495df50898f1ebd69d22fbcedf9689a',
		'hex',
	),
	roundLength: 103,
	initDelegates: validDelegateAccounts.map(a => a.address),
	accounts: [...validAccounts, ...validDelegateAccounts] as Account[],
	accountAssetSchemas: defaultAccountModules,
} as GenesisBlockParams;

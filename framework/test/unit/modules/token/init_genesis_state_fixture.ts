/*
 * Copyright © 2022 Lisk Foundation
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

// import { getRandomBytes } from '@liskhq/lisk-cryptography';

const oneUnit = BigInt('100000000');

const validData = {
	userSubstore: [
		{
			address: Buffer.alloc(20, 0),
			tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
			availableBalance: oneUnit,
			lockedBalances: [{ moduleID: 3, amount: oneUnit }],
		},
		{
			address: Buffer.alloc(20, 0),
			tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]),
			availableBalance: oneUnit,
			lockedBalances: [{ moduleID: 3, amount: oneUnit }],
		},
		{
			address: Buffer.alloc(20, 1),
			tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
			availableBalance: oneUnit,
			lockedBalances: [
				{ moduleID: 3, amount: oneUnit },
				{ moduleID: 4, amount: oneUnit },
			],
		},
	],
	supplySubstore: [
		{ localID: Buffer.from([0, 0, 0, 0]), totalSupply: oneUnit * BigInt(6) },
		{ localID: Buffer.from([0, 0, 1, 0]), totalSupply: oneUnit * BigInt(2) },
	],
	escrowSubstore: [
		{
			escrowChainID: Buffer.from([0, 0, 0, 2]),
			localID: Buffer.from([0, 0, 0, 0]),
			amount: oneUnit,
		},
	],
	availableLocalIDSubstore: {
		nextAvailableLocalID: Buffer.from([0, 0, 1, 1]),
	},
	terminatedEscrowSubstore: [Buffer.from([0, 0, 0, 3])],
};

export const validGenesisAssets = [['Valid genesis asset', validData]];

export const invalidGenesisAssets = [
	[
		'Invalid address length',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(10, 0),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: oneUnit,
					lockedBalances: [{ moduleID: 3, amount: oneUnit }],
				},
				...validData.userSubstore.slice(1),
			],
		},
		".address' minLength not satisfied",
	],
	[
		'Invalid token id length',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(20, 0),
					tokenID: Buffer.from([9, 0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: oneUnit,
					lockedBalances: [{ moduleID: 3, amount: oneUnit }],
				},
				...validData.userSubstore.slice(1),
			],
		},
		"tokenID' maxLength exceeded",
	],
	[
		'Overflow uint64 for available balance',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(20, 0),
					tokenID: Buffer.from([9, 0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt('1000000000000000000000000000'),
					lockedBalances: [{ moduleID: 3, amount: oneUnit }],
				},
				...validData.userSubstore.slice(1),
			],
		},
		'Value out of range of uint64',
	],
	[
		'Unsorted userstore by address',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(20, 9),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt('1000'),
					lockedBalances: [{ moduleID: 3, amount: oneUnit }],
				},
				...validData.userSubstore.slice(1),
			],
		},
		'UserSubstore must be sorted by address and tokenID',
	],
	[
		'Locked balances is not sorted',
		{
			...validData,
			userSubstore: [
				...validData.userSubstore,
				{
					address: Buffer.alloc(20, 2),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt('1000'),
					lockedBalances: [
						{ moduleID: 3, amount: oneUnit },
						{ moduleID: 2, amount: oneUnit },
					],
				},
			],
		},
		'Locked balances must be sorted by moduleID',
	],
	[
		'duplicate locked balances',
		{
			...validData,
			userSubstore: [
				...validData.userSubstore,
				{
					address: Buffer.alloc(20, 2),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt('1000'),
					lockedBalances: [
						{ moduleID: 2, amount: oneUnit },
						{ moduleID: 2, amount: oneUnit },
					],
				},
			],
		},
		'duplicate moduleID in locked balances',
	],
	[
		'Zero locked balances',
		{
			...validData,
			userSubstore: [
				...validData.userSubstore,
				{
					address: Buffer.alloc(20, 2),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt('1000'),
					lockedBalances: [{ moduleID: 2, amount: BigInt(0) }],
				},
			],
		},
		'contains 0 amount locked balance',
	],
	[
		'Empty account on userSubstore',
		{
			...validData,
			userSubstore: [
				...validData.userSubstore,
				{
					address: Buffer.alloc(20, 2),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt('0'),
					lockedBalances: [],
				},
			],
		},
		'has empty data',
	],
	[
		'Duplicate supply store',
		{
			...validData,
			supplySubstore: [
				...validData.supplySubstore,
				{ localID: Buffer.from([0, 0, 1, 0]), totalSupply: oneUnit * BigInt(6) },
			],
		},
		'Supply store local ID 00000100 is duplicated.',
	],
	[
		'Unsorted supply store',
		{
			...validData,
			supplySubstore: [
				...validData.supplySubstore,
				{ localID: Buffer.from([0, 0, 0, 1]), totalSupply: oneUnit * BigInt(6) },
			],
		},
		'SupplySubstore must be sorted by localID',
	],
	[
		'Duplicate escrow store',
		{
			...validData,
			escrowSubstore: [
				...validData.escrowSubstore,
				{
					escrowChainID: Buffer.from([0, 0, 0, 2]),
					localID: Buffer.from([0, 0, 0, 0]),
					amount: oneUnit,
				},
			],
		},
		'Escrow store escrowChainID 00000002 and localID 00000000 pair is duplicated',
	],
	[
		'Unsorted escrow store',
		{
			...validData,
			escrowSubstore: [
				...validData.escrowSubstore,
				{
					escrowChainID: Buffer.from([0, 0, 0, 0]),
					localID: Buffer.from([0, 0, 0, 0]),
					amount: oneUnit,
				},
			],
		},
		'EscrowSubstore must be sorted by escrowChainID and localID',
	],
	[
		'Duplicated terminated escrow store',
		{
			...validData,
			terminatedEscrowSubstore: [Buffer.from([0, 0, 0, 3]), Buffer.from([0, 0, 0, 3])],
		},
		'Terminated escrow store chainID has duplicate.',
	],
	[
		'Unsorted terminated escrow store',
		{
			...validData,
			terminatedEscrowSubstore: [Buffer.from([1, 0, 0, 3]), Buffer.from([0, 0, 0, 3])],
		},
		'Terminated escrow store must be sorted by chainID',
	],
	[
		'Total supply exceeds uint64',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(20, 0),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt(2) ** BigInt(64) - BigInt(10),
					lockedBalances: [{ moduleID: 3, amount: oneUnit }],
				},
				{
					address: Buffer.alloc(20, 0),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]),
					availableBalance: oneUnit,
					lockedBalances: [{ moduleID: 3, amount: oneUnit }],
				},
				{
					address: Buffer.alloc(20, 1),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt(2) ** BigInt(64) - BigInt(10),
					lockedBalances: [
						{ moduleID: 3, amount: oneUnit },
						{ moduleID: 4, amount: oneUnit },
					],
				},
			],
		},
		'Total supply for LocalID: 00000000 exceeds uint64 range',
	],
	[
		'Not matching calculated and stored total supply',
		{
			...validData,
			supplySubstore: [
				{ localID: Buffer.from([0, 0, 0, 0]), totalSupply: oneUnit * BigInt(4) },
				{ localID: Buffer.from([0, 0, 1, 0]), totalSupply: oneUnit * BigInt(2) },
			],
		},
		'Stored total supply conflicts with computed supply',
	],
	[
		'Missing total supply',
		{
			...validData,
			supplySubstore: [
				...validData.supplySubstore,
				{ localID: Buffer.from([0, 0, 9, 9]), totalSupply: oneUnit * BigInt(2) },
			],
		},
		'Stored total supply is non zero but cannot be computed',
	],
	[
		'Invalid availableLocalID',
		{
			...validData,
			availableLocalIDSubstore: {
				nextAvailableLocalID: Buffer.from([0, 0, 0, 0]),
			},
		},
		'Max local ID is higher than next availableLocalID',
	],
];

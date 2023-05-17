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
const oneUnit = BigInt('100000000');

const validData = {
	userSubstore: [
		{
			address: Buffer.alloc(20, 0),
			tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
			availableBalance: oneUnit,
			lockedBalances: [{ module: 'pos', amount: oneUnit }],
		},
		{
			address: Buffer.alloc(20, 0),
			tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]),
			availableBalance: oneUnit,
			lockedBalances: [{ module: 'pos', amount: oneUnit }],
		},
		{
			address: Buffer.alloc(20, 1),
			tokenID: Buffer.from([0, 0, 0, 2, 0, 0, 0, 0]),
			availableBalance: oneUnit,
			lockedBalances: [
				{ module: 'fee', amount: oneUnit },
				{ module: 'pos', amount: oneUnit },
			],
		},
	],
	supplySubstore: [
		{ tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), totalSupply: oneUnit * BigInt(2) },
		{ tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]), totalSupply: oneUnit * BigInt(3) },
	],
	escrowSubstore: [
		{
			escrowChainID: Buffer.from([0, 0, 0, 2]),
			tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]),
			amount: oneUnit,
		},
	],
	supportedTokensSubstore: [
		{
			chainID: Buffer.from([0, 0, 0, 2]),
			supportedTokenIDs: [],
		},
		{
			chainID: Buffer.from([0, 0, 0, 3]),
			supportedTokenIDs: [Buffer.from([0, 0, 0, 3, 0, 0, 0, 1])],
		},
	],
};

export const validGenesisAssets = [['Valid genesis asset', validData]];

export const invalidGenesisAssets = [
	[
		'minimum token id length not satisfied',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(20, 0),
					tokenID: Buffer.from([9, 0, 0]),
					availableBalance: oneUnit,
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
				},
				...validData.userSubstore.slice(1),
			],
		},
		"tokenID' minLength not satisfied",
	],
	[
		'Invalid address length',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(10, 0),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: oneUnit,
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
				},
				...validData.userSubstore.slice(1),
			],
		},
		".address' address length invalid",
	],
	[
		'maximum token id length',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(20, 0),
					tokenID: Buffer.from([9, 0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: oneUnit,
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
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
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
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
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
				},
				...validData.userSubstore.slice(1),
			],
		},
		'UserSubstore must be sorted by address and tokenID',
	],
	[
		'Unsorted tokens in userstore by address',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(20, 1),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt('1000'),
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
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
						{ module: 'token', amount: oneUnit },
						{ module: 'pos', amount: oneUnit },
					],
				},
			],
		},
		'Locked balances must be sorted by module',
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
						{ module: 'token', amount: oneUnit },
						{ module: 'token', amount: oneUnit },
					],
				},
			],
		},
		'duplicate module in locked balances',
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
					lockedBalances: [{ module: 'token', amount: BigInt(0) }],
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
		'Duplicate address and tokenID for userSubstore',
		{
			...validData,
			userSubstore: [
				{
					address: Buffer.alloc(20, 0),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: oneUnit,
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
				},
				{
					address: Buffer.alloc(20, 0),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: oneUnit,
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
				},
			],
		},
		'pair is duplicated',
	],
	[
		'minimum tokenID length not satisfied for supplyStore',
		{
			...validData,
			supplySubstore: [
				...validData.supplySubstore,
				{
					tokenID: Buffer.alloc(1, 0),
					totalSupply: oneUnit * BigInt(2),
				},
			],
		},
		"tokenID' minLength not satisfied",
	],
	[
		'maximum tokenID length for supplyStore',
		{
			...validData,
			supplySubstore: [
				...validData.supplySubstore,
				{
					tokenID: Buffer.alloc(10, 0),
					totalSupply: oneUnit * BigInt(2),
				},
			],
		},
		"tokenID' maxLength exceeded",
	],
	[
		'Duplicate supply store',
		{
			...validData,
			supplySubstore: [
				...validData.supplySubstore,
				{ tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]), totalSupply: oneUnit * BigInt(6) },
			],
		},
		'Supply store token ID 0000000000000100 is duplicated.',
	],
	[
		'Unsorted supply store',
		{
			...validData,
			supplySubstore: [
				...validData.supplySubstore,
				{ tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]), totalSupply: oneUnit * BigInt(6) },
			],
		},
		'SupplySubstore must be sorted by tokenID',
	],
	[
		'escrowChainID minimum length not satisified for escrowSubstore',
		{
			...validData,
			escrowSubstore: [
				...validData.escrowSubstore,
				{
					escrowChainID: Buffer.from([0, 0, 0]),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]),
					amount: oneUnit,
				},
			],
		},
		".escrowChainID' minLength not satisfied",
	],
	[
		'escrowChainID maximum length not exceeded for escrowSubstore',
		{
			...validData,
			escrowSubstore: [
				...validData.escrowSubstore,
				{
					escrowChainID: Buffer.from([0, 0, 0, 0, 0]),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]),
					amount: oneUnit,
				},
			],
		},
		".escrowChainID' maxLength exceeded",
	],
	[
		'tokenID minimum length not satisfied for escrowSubstore',
		{
			...validData,
			escrowSubstore: [
				...validData.escrowSubstore,
				{
					escrowChainID: Buffer.from([0, 0, 0, 0, 0]),
					tokenID: Buffer.from([0, 0, 0, 0, 0]),
					amount: oneUnit,
				},
			],
		},
		".tokenID' minLength not satisfied",
	],
	[
		'tokenID maximum length exceeded for escrowSubstore',
		{
			...validData,
			escrowSubstore: [
				...validData.escrowSubstore,
				{
					escrowChainID: Buffer.from([0, 0, 0, 0, 0]),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
					amount: oneUnit,
				},
			],
		},
		".tokenID' maxLength exceeded",
	],
	[
		'Duplicate escrow store',
		{
			...validData,
			escrowSubstore: [
				...validData.escrowSubstore,
				{
					escrowChainID: Buffer.from([0, 0, 0, 2]),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]),
					amount: oneUnit,
				},
			],
		},
		'Escrow store escrowChainID 00000002 and tokenID 0000000000000100 pair is duplicated',
	],
	[
		'Unsorted escrow store',
		{
			...validData,
			escrowSubstore: [
				...validData.escrowSubstore,
				{
					escrowChainID: Buffer.from([0, 0, 0, 1]),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					amount: oneUnit,
				},
			],
		},
		'EscrowSubstore must be sorted by escrowChainID and tokenID',
	],
	[
		'Unsorted escrow store for token id',
		{
			...validData,
			escrowSubstore: [
				...validData.escrowSubstore,
				{
					escrowChainID: Buffer.from([0, 0, 0, 2]),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					amount: oneUnit,
				},
			],
		},
		'EscrowSubstore must be sorted by escrowChainID and tokenID',
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
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
				},
				{
					address: Buffer.alloc(20, 0),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]),
					availableBalance: oneUnit,
					lockedBalances: [{ module: 'pos', amount: oneUnit }],
				},
				{
					address: Buffer.alloc(20, 1),
					tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
					availableBalance: BigInt(2) ** BigInt(64) - BigInt(10),
					lockedBalances: [
						{ module: 'fee', amount: oneUnit },
						{ module: 'pos', amount: oneUnit },
					],
				},
			],
		},
		'Total supply for tokenID: 0000000000000000 exceeds uint64 range',
	],
	[
		'Not matching calculated and stored total supply',
		{
			...validData,
			supplySubstore: [
				{ tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), totalSupply: oneUnit * BigInt(4) },
				{ tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]), totalSupply: oneUnit * BigInt(2) },
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
				{ tokenID: Buffer.from([0, 0, 0, 0, 0, 0, 9, 9]), totalSupply: oneUnit * BigInt(2) },
			],
		},
		'Stored total supply is non zero but cannot be computed',
	],
	[
		'chainID minLength not satisfied for supportedTOkensSubstore',
		{
			...validData,
			supportedTokensSubstore: [
				{
					chainID: Buffer.from([0, 0]),
					supportedTokenIDs: [],
				},
			],
		},
		"chainID' minLength not satisfied",
	],
	[
		'chainID maxLength exceeded for supportedTOkensSubstore',
		{
			...validData,
			supportedTokensSubstore: [
				{
					chainID: Buffer.from([0, 0, 0, 0, 0]),
					supportedTokenIDs: [],
				},
			],
		},
		"chainID' maxLength exceeded",
	],
	[
		'tokenID minLength not satisfied for supportedTOkensSubstore',
		{
			...validData,
			supportedTokensSubstore: [
				{
					chainID: Buffer.from([0, 0, 0, 2]),
					supportedTokenIDs: [Buffer.from([1, 0])],
				},
			],
		},
		"supportedTokenIDs.0' minLength not satisfied",
	],
	[
		'tokenID maxLength exceeded for supportedTOkensSubstore',
		{
			...validData,
			supportedTokensSubstore: [
				{
					chainID: Buffer.from([0, 0, 0, 2]),
					supportedTokenIDs: [Buffer.from([1, 0, 0, 0, 0, 0, 0, 0, 0])],
				},
			],
		},
		"supportedTokenIDs.0' maxLength exceeded",
	],
	[
		'Supported tokens store has duplicate chainID on supported ID',
		{
			...validData,
			supportedTokensSubstore: [
				...validData.supportedTokensSubstore,
				{
					chainID: Buffer.from([0, 0, 0, 3]),
					supportedTokenIDs: [],
				},
			],
		},
		'supportedTokenIDsSet chain ID 00000003 is duplicated',
	],
	[
		'Supported tokens store has unsorted chainID',
		{
			...validData,
			supportedTokensSubstore: [
				...validData.supportedTokensSubstore,
				{
					chainID: Buffer.from([0, 0, 0, 1]),
					supportedTokenIDs: [],
				},
			],
		},
		'supportedTokensSubstore must be sorted by chainID',
	],
	[
		'Supported tokens store has duplicate supported token id',
		{
			...validData,
			supportedTokensSubstore: [
				{
					chainID: Buffer.from([0, 0, 0, 4]),
					supportedTokenIDs: [
						Buffer.from([0, 0, 0, 4, 0, 0, 0, 0]),
						Buffer.from([0, 0, 0, 4, 0, 0, 0, 0]),
					],
				},
			],
		},
		'supportedTokensSubstore tokenIDs must be unique and sorted by lexicographically',
	],
	[
		'Supported tokens store has unsorted supported token id',
		{
			...validData,
			supportedTokensSubstore: [
				...validData.supportedTokensSubstore,
				{
					chainID: Buffer.from([0, 0, 0, 4]),
					supportedTokenIDs: [
						Buffer.from([0, 0, 0, 4, 0, 0, 0, 1]),
						Buffer.from([0, 0, 0, 4, 0, 0, 0, 0]),
					],
				},
			],
		},
		'supportedTokensSubstore tokenIDs must be unique and sorted by lexicographically',
	],
	[
		'Supported tokens store has supported token id which does not match with chain id',
		{
			...validData,
			supportedTokensSubstore: [
				...validData.supportedTokensSubstore,
				{
					chainID: Buffer.from([0, 0, 0, 4]),
					supportedTokenIDs: [Buffer.from([0, 0, 0, 3, 0, 0, 0, 0])],
				},
			],
		},
		'supportedTokensSubstore tokenIDs must match the chainID',
	],
];

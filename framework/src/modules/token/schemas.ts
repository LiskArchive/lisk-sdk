/*
 * Copyright © 2021 Lisk Foundation
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

export const configSchema = {
	$id: '/token/config',
	type: 'object',
	properties: {
		minBalance: {
			type: 'string',
			format: 'uint64',
		},
	},
	required: [],
};

export interface UserStoreData {
	availableBalance: bigint;
	lockedBalances: {
		moduleID: number;
		amount: bigint;
	}[];
}

export const userStoreSchema = {
	$id: '/token/store/user',
	type: 'object',
	required: ['availableBalance', 'lockedBalances'],
	properties: {
		availableBalance: { dataType: 'uint64', fieldNumber: 1 },
		lockedBalances: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['moduleID', 'amount'],
				properties: {
					moduleID: { dataType: 'uint32', fieldNumber: 1 },
					amount: { dataType: 'uint64', fieldNumber: 2 },
				},
			},
		},
	},
};

export const getBalanceRequestSchema = {
	$id: '/token/endpoint/getBalance',
	type: 'object',
	properties: {
		address: {
			type: 'string',
			format: 'hex',
		},
	},
	required: ['address'],
};

export const transferParamsSchema = {
	$id: 'lisk/transfer-params',
	title: 'Transfer transaction params',
	type: 'object',
	required: ['amount', 'recipientAddress', 'data'],
	properties: {
		amount: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
			minLength: 20,
			maxLength: 20,
		},
		data: {
			dataType: 'string',
			fieldNumber: 3,
			minLength: 0,
			maxLength: 64,
		},
	},
};

export const genesisTokenStoreSchema = {
	$id: '/token/module/genesis',
	type: 'object',
	required: ['userSubstore'],
	properties: {
		userSubstore: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'tokenID', 'availableBalance', 'lockedBalances'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					tokenID: {
						type: 'object',
						fieldNumber: 2,
						required: ['chainID', 'localID'],
						properties: {
							chainID: {
								dataType: 'uint32',
								fieldNumber: 1,
							},
							localID: {
								dataType: 'uint32',
								fieldNumber: 2,
							},
						},
					},
					availableBalance: {
						dataType: 'uint64',
						fieldNumber: 3,
					},
					lockedBalances: {
						type: 'array',
						fieldNumber: 4,
						items: {
							type: 'object',
							required: ['moduleID', 'amount'],
							properties: {
								moduleID: {
									dataType: 'uint32',
									fieldNumber: 1,
								},
								amount: {
									dataType: 'uint64',
									fieldNumber: 2,
								},
							},
						},
					},
				},
			},
		},
	},
};

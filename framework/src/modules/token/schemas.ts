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

import {
	CHAIN_ID_LENGTH,
	TOKEN_ID_LENGTH,
	MAX_DATA_LENGTH,
	MIN_MODULE_NAME_LENGTH,
	MAX_MODULE_NAME_LENGTH,
} from './constants';

export const configSchema = {
	$id: '/token/config',
	type: 'object',
	properties: {
		supportedTokenIDs: {
			items: {
				type: 'string',
				format: 'hex',
			},
		},
		userAccountInitializationFee: {
			type: 'string',
			format: 'uint64',
		},
		escrowAccountInitializationFee: {
			type: 'string',
			format: 'uint64',
		},
	},
};

export interface UserStoreData {
	availableBalance: bigint;
	lockedBalances: {
		module: string;
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
				required: ['module', 'amount'],
				properties: {
					module: { dataType: 'string', fieldNumber: 1 },
					amount: { dataType: 'uint64', fieldNumber: 2 },
				},
			},
		},
	},
};

export interface SupplyStoreData {
	totalSupply: bigint;
}

export const supplyStoreSchema = {
	$id: '/token/store/supply',
	type: 'object',
	required: ['totalSupply'],
	properties: {
		totalSupply: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
	},
};

export interface AvailableLocalIDStoreData {
	nextAvailableLocalID: Buffer;
}

export const availableLocalIDStoreSchema = {
	$id: '/token/store/availableLocalID',
	type: 'object',
	required: ['nextAvailableLocalID'],
	properties: {
		nextAvailableLocalID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
};

export interface EscrowStoreData {
	amount: bigint;
}

export const escrowStoreSchema = {
	$id: '/token/store/escrow',
	type: 'object',
	required: ['amount'],
	properties: {
		amount: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
	},
};

export interface TerminatedEscrowStoreData {
	escrowTerminated: boolean;
}

export const terminatedEscrowStoreSchema = {
	$id: '/token/store/terminatedEscrow',
	type: 'object',
	required: ['escrowTerminated'],
	properties: {
		escrowTerminated: {
			dataType: 'boolean',
			fieldNumber: 1,
		},
	},
};

export const transferParamsSchema = {
	$id: '/lisk/transferParams',
	title: 'Transfer transaction params',
	type: 'object',
	required: ['tokenID', 'amount', 'recipientAddress', 'data'],
	properties: {
		tokenID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 3,
			format: 'lisk32',
		},
		data: {
			dataType: 'string',
			fieldNumber: 4,
			minLength: 0,
			maxLength: MAX_DATA_LENGTH,
		},
	},
};

export const crossChainTransferParamsSchema = {
	$id: '/lisk/ccTransferParams',
	type: 'object',
	required: [
		'tokenID',
		'amount',
		'receivingChainID',
		'recipientAddress',
		'data',
		'messageFee',
		'messageFeeTokenID',
	],
	properties: {
		tokenID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		receivingChainID: {
			dataType: 'bytes',
			fieldNumber: 3,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 4,
			format: 'lisk32',
		},
		data: {
			dataType: 'string',
			fieldNumber: 5,
			minLength: 0,
			maxLength: MAX_DATA_LENGTH,
		},
		messageFee: {
			dataType: 'uint64',
			fieldNumber: 6,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			fieldNumber: 7,
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
		},
	},
};

export interface CCTransferMessageParams {
	tokenID: Buffer;
	amount: bigint;
	senderAddress: Buffer;
	recipientAddress: Buffer;
	data: string;
}

export const crossChainTransferMessageParams = {
	$id: '/lisk/ccTransferMessageParams',
	type: 'object',
	required: ['tokenID', 'amount', 'senderAddress', 'recipientAddress', 'data'],
	properties: {
		tokenID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		senderAddress: {
			dataType: 'bytes',
			fieldNumber: 3,
			format: 'lisk32',
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 4,
			format: 'lisk32',
		},
		data: {
			dataType: 'string',
			fieldNumber: 5,
			minLength: 0,
			maxLength: MAX_DATA_LENGTH,
		},
	},
};

export interface CCForwardMessageParams {
	tokenID: Buffer;
	amount: bigint;
	senderAddress: Buffer;
	forwardToChainID: Buffer;
	recipientAddress: Buffer;
	data: string;
	forwardedMessageFee: bigint;
}

export const crossChainForwardMessageParams = {
	$id: '/lisk/ccForwardMessageParams',
	type: 'object',
	required: [
		'tokenID',
		'amount',
		'senderAddress',
		'forwardToChainID',
		'recipientAddress',
		'data',
		'forwardedMessageFee',
	],
	properties: {
		tokenID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		senderAddress: {
			dataType: 'bytes',
			fieldNumber: 3,
			format: 'lisk32',
		},
		forwardToChainID: {
			dataType: 'bytes',
			fieldNumber: 4,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 5,
			format: 'lisk32',
		},
		data: {
			dataType: 'string',
			fieldNumber: 6,
			minLength: 0,
			maxLength: MAX_DATA_LENGTH,
		},
		forwardedMessageFee: {
			dataType: 'uint64',
			fieldNumber: 7,
		},
	},
};

export const genesisTokenStoreSchema = {
	$id: '/token/module/genesis',
	type: 'object',
	required: ['userSubstore', 'supplySubstore', 'escrowSubstore', 'supportedTokensSubstore'],
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
						format: 'lisk32',
						fieldNumber: 1,
					},
					tokenID: {
						dataType: 'bytes',
						fieldNumber: 2,
						minLength: TOKEN_ID_LENGTH,
						maxLength: TOKEN_ID_LENGTH,
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
							required: ['module', 'amount'],
							properties: {
								module: {
									dataType: 'string',
									minLength: MIN_MODULE_NAME_LENGTH,
									maxLength: MAX_MODULE_NAME_LENGTH,
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
		supplySubstore: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['tokenID', 'totalSupply'],
				properties: {
					tokenID: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: TOKEN_ID_LENGTH,
						maxLength: TOKEN_ID_LENGTH,
					},
					totalSupply: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
		},
		escrowSubstore: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				required: ['escrowChainID', 'tokenID', 'amount'],
				properties: {
					escrowChainID: {
						dataType: 'bytes',
						minLength: CHAIN_ID_LENGTH,
						maxLength: CHAIN_ID_LENGTH,
						fieldNumber: 1,
					},
					tokenID: {
						dataType: 'bytes',
						fieldNumber: 2,
						minLength: TOKEN_ID_LENGTH,
						maxLength: TOKEN_ID_LENGTH,
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 3,
					},
				},
			},
		},
		supportedTokensSubstore: {
			type: 'array',
			fieldNumber: 4,
			items: {
				type: 'object',
				required: ['chainID', 'supportedTokenIDs'],
				properties: {
					chainID: {
						dataType: 'bytes',
						minLength: CHAIN_ID_LENGTH,
						maxLength: CHAIN_ID_LENGTH,
						fieldNumber: 1,
					},
					supportedTokenIDs: {
						type: 'array',
						fieldNumber: 2,
						items: {
							dataType: 'bytes',
							minLength: TOKEN_ID_LENGTH,
							maxLength: TOKEN_ID_LENGTH,
						},
					},
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
			format: 'lisk32',
		},
		tokenID: {
			type: 'string',
			format: 'hex',
			minLength: TOKEN_ID_LENGTH * 2,
			maxLength: TOKEN_ID_LENGTH * 2,
		},
	},
	required: ['address', 'tokenID'],
};

export const getBalanceResponseSchema = {
	$id: '/token/endpoint/getBalanceResponse',
	type: 'object',
	required: ['availableBalance', 'lockedBalances'],
	properties: {
		availableBalance: {
			type: 'string',
			format: 'uint64',
		},
		lockedBalances: {
			type: 'array',
			items: {
				type: 'object',
				required: ['module', 'amount'],
				properties: {
					module: {
						type: 'string',
					},
					amount: {
						type: 'string',
						format: 'uint64',
					},
				},
			},
		},
	},
};

export const getBalancesRequestSchema = {
	$id: '/token/endpoint/getBalance',
	type: 'object',
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
	required: ['address'],
};

export const getBalancesResponseSchema = {
	$id: '/token/endpoint/getBalancesResponse',
	type: 'object',
	required: ['balances'],
	properties: {
		balances: {
			type: 'array',
			items: {
				type: 'object',
				required: ['availableBalance', 'lockedBalances', 'tokenID'],
				properties: {
					tokenID: {
						type: 'string',
						format: 'hex',
					},
					availableBalance: {
						type: 'string',
						format: 'uint64',
					},
					lockedBalances: {
						type: 'array',
						items: {
							type: 'object',
							required: ['module', 'amount'],
							properties: {
								module: {
									type: 'string',
								},
								amount: {
									type: 'string',
									format: 'uint64',
								},
							},
						},
					},
				},
			},
		},
	},
};

export const getTotalSupplyResponseSchema = {
	$id: '/token/endpoint/getTotalSupplyResponse',
	type: 'object',
	properties: {
		totalSupply: {
			type: 'array',
			items: {
				type: 'object',
				required: ['totalSupply', 'tokenID'],
				properties: {
					tokenID: {
						type: 'string',
						format: 'hex',
					},
					totalSupply: {
						type: 'string',
						format: 'uint64',
					},
				},
			},
		},
	},
};

export const getSupportedTokensResponseSchema = {
	$id: '/token/endpoint/getSupportedTokensResponse',
	type: 'object',
	properties: {
		tokenIDs: {
			type: 'array',
			items: {
				type: 'string',
				format: 'hex',
			},
		},
	},
};

export const getEscrowedAmountsResponseSchema = {
	$id: '/token/endpoint/getEscrowedAmountsResponse',
	type: 'object',
	properties: {
		escrowedAmounts: {
			type: 'array',
			items: {
				type: 'object',
				required: ['escrowChainID', 'totalSupply', 'tokenID'],
				properties: {
					escrowChainID: {
						type: 'string',
						format: 'hex',
					},
					tokenID: {
						type: 'string',
						format: 'hex',
					},
					amount: {
						type: 'string',
						format: 'uint64',
					},
				},
			},
		},
	},
};

export const isSupportedRequestSchema = {
	$id: '/token/endpoint/isSupportedRequest',
	type: 'object',
	properties: {
		tokenID: {
			type: 'string',
			format: 'hex',
			minLength: TOKEN_ID_LENGTH * 2,
			maxLength: TOKEN_ID_LENGTH * 2,
		},
	},
	required: ['tokenID'],
};

export const isSupportedResponseSchema = {
	$id: '/token/endpoint/isSupportedResponse',
	type: 'object',
	properties: {
		supported: {
			dataType: 'boolean',
		},
	},
	required: ['supported'],
};

export const getInitializationFeesResponseSchema = {
	$id: '/token/endpoint/getInitializationFees',
	type: 'object',
	properties: {
		userAccount: {
			type: 'string',
			format: 'uint64',
		},
		escrowAccount: {
			type: 'string',
			format: 'uint64',
		},
	},
	required: ['userAccount', 'escrowAccount'],
};

export const hasUserAccountRequestSchema = {
	$id: '/token/endpoint/hasUserAccountRequest',
	type: 'object',
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
		tokenID: {
			type: 'string',
			format: 'hex',
			minLength: TOKEN_ID_LENGTH * 2,
			maxLength: TOKEN_ID_LENGTH * 2,
		},
	},
	required: ['address', 'tokenID'],
};

export const hasEscrowAccountRequestSchema = {
	$id: '/token/endpoint/hasEscrowAccountRequest',
	type: 'object',
	properties: {
		tokenID: {
			type: 'string',
			format: 'hex',
			minLength: TOKEN_ID_LENGTH * 2,
			maxLength: TOKEN_ID_LENGTH * 2,
		},
		escrowChainID: {
			type: 'string',
			format: 'hex',
		},
	},
	required: ['tokenID', 'escrowChainID'],
};

export const hasUserAccountResponseSchema = {
	$id: '/token/endpoint/hasUserAccountResponse',
	type: 'object',
	properties: {
		exists: {
			type: 'boolean',
		},
	},
};

export const hasEscrowAccountResponseSchema = {
	$id: '/token/endpoint/hasEscrowAccountResponse',
	type: 'object',
	properties: {
		exists: {
			type: 'boolean',
		},
	},
};

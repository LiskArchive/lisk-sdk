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
	LOCAL_ID_LENGTH,
	TOKEN_ID_LENGTH,
	ADDRESS_LENGTH,
	MAX_DATA_LENGTH,
} from './constants';

export const configSchema = {
	$id: '/token/config',
	type: 'object',
	properties: {
		minBalances: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
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
		supportedTokenIDs: {
			items: {
				type: 'string',
				format: 'hex',
			},
		},
	},
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
	$id: 'lisk/transfer-params',
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
			minLength: ADDRESS_LENGTH,
			maxLength: ADDRESS_LENGTH,
		},
		data: {
			dataType: 'string',
			fieldNumber: 4,
			minLength: 0,
			maxLength: MAX_DATA_LENGTH,
		},
	},
};

export const crossChainTransferParams = {
	$id: 'lisk/cc-transfer-params',
	type: 'object',
	required: ['tokenID', 'amount', 'receivingChainID', 'recipientAddress', 'data', 'messageFee'],
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
			minLength: ADDRESS_LENGTH,
			maxLength: ADDRESS_LENGTH,
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
	$id: 'lisk/cc-transfer-message-params',
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
			minLength: ADDRESS_LENGTH,
			maxLength: ADDRESS_LENGTH,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 4,
			minLength: ADDRESS_LENGTH,
			maxLength: ADDRESS_LENGTH,
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
	$id: 'lisk/cc-forward-message-params',
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
			minLength: ADDRESS_LENGTH,
			maxLength: ADDRESS_LENGTH,
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
			minLength: ADDRESS_LENGTH,
			maxLength: ADDRESS_LENGTH,
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
	required: [
		'userSubstore',
		'supplySubstore',
		'escrowSubstore',
		'availableLocalIDSubstore',
		'terminatedEscrowSubstore',
	],
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
						minLength: 20,
						maxLength: 20,
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
		supplySubstore: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['localID', 'totalSupply'],
				properties: {
					localID: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: LOCAL_ID_LENGTH,
						maxLength: LOCAL_ID_LENGTH,
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
				required: ['escrowChainID', 'localID', 'amount'],
				properties: {
					escrowChainID: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: CHAIN_ID_LENGTH,
						maxLength: CHAIN_ID_LENGTH,
					},
					localID: {
						dataType: 'bytes',
						fieldNumber: 2,
						minLength: LOCAL_ID_LENGTH,
						maxLength: LOCAL_ID_LENGTH,
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 3,
					},
				},
			},
		},
		availableLocalIDSubstore: {
			type: 'object',
			required: ['nextAvailableLocalID'],
			fieldNumber: 4,
			properties: {
				nextAvailableLocalID: {
					dataType: 'bytes',
					fieldNumber: 1,
					minLength: LOCAL_ID_LENGTH,
					maxLength: LOCAL_ID_LENGTH,
				},
			},
		},
		terminatedEscrowSubstore: {
			type: 'array',
			fieldNumber: 5,
			items: {
				dataType: 'bytes',
				minLength: CHAIN_ID_LENGTH,
				maxLength: CHAIN_ID_LENGTH,
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
			minLength: ADDRESS_LENGTH * 2,
			maxLength: ADDRESS_LENGTH * 2,
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

export const getBalancesRequestSchema = {
	$id: '/token/endpoint/getBalance',
	type: 'object',
	properties: {
		address: {
			type: 'string',
			format: 'hex',
			minLength: ADDRESS_LENGTH * 2,
			maxLength: ADDRESS_LENGTH * 2,
		},
	},
	required: ['address'],
};

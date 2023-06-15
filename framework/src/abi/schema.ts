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

import {
	blockHeaderSchema,
	blockSchema,
	blockAssetSchema,
	transactionSchema,
} from '@liskhq/lisk-chain';
import {
	MIN_MODULE_NAME_LENGTH,
	MAX_MODULE_NAME_LENGTH,
	MIN_EVENT_NAME_LENGTH,
	MAX_EVENT_NAME_LENGTH,
} from '@liskhq/lisk-chain/dist-node/constants';

export { blockHeaderSchema, blockSchema };

export const eventSchema = {
	$id: '/block/event',
	type: 'object',
	required: ['module', 'name', 'data', 'topics', 'height', 'index'],
	properties: {
		module: {
			dataType: 'string',
			minLength: MIN_MODULE_NAME_LENGTH,
			maxLength: MAX_MODULE_NAME_LENGTH,
			fieldNumber: 1,
		},
		name: {
			dataType: 'string',
			minLength: MIN_EVENT_NAME_LENGTH,
			maxLength: MAX_EVENT_NAME_LENGTH,
			fieldNumber: 2,
		},
		data: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		topics: {
			type: 'array',
			fieldNumber: 4,
			items: {
				dataType: 'bytes',
			},
		},
		height: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
		index: {
			dataType: 'uint32',
			fieldNumber: 6,
		},
	},
};

export const validatorSchema = {
	$id: '/abi/validator',
	type: 'object',
	required: ['address', 'bftWeight', 'generatorKey', 'blsKey'],
	properties: {
		address: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		bftWeight: {
			fieldNumber: 2,
			dataType: 'uint64',
		},
		generatorKey: {
			fieldNumber: 3,
			dataType: 'bytes',
		},
		blsKey: {
			fieldNumber: 4,
			dataType: 'bytes',
		},
	},
};

export const initRequestSchema = {
	$id: '/abi/initRequest',
	type: 'object',
	required: ['chainID', 'lastBlockHeight', 'lastStateRoot'],
	properties: {
		chainID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		lastBlockHeight: {
			fieldNumber: 2,
			dataType: 'uint32',
		},
		lastStateRoot: {
			fieldNumber: 3,
			dataType: 'bytes',
		},
	},
};

export const initResponseSchema = {
	$id: '/abi/initResponse',
	type: 'object',
	required: [],
	properties: {},
};

export const initStateMachineRequestSchema = {
	$id: '/abi/initStateMachineRequest',
	type: 'object',
	required: ['header'],
	properties: {
		header: {
			fieldNumber: 1,
			...blockHeaderSchema,
		},
	},
};

export const initStateMachineResponseSchema = {
	$id: '/abi/initStateMachineResponse',
	type: 'object',
	required: ['contextID'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const initGenesisStateRequestSchema = {
	$id: '/abi/initGenesisStateRequest',
	type: 'object',
	required: ['contextID'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const initGenesisStateResponseSchema = {
	$id: '/abi/initGenesisStateResponse',
	type: 'object',
	required: ['events', 'preCommitThreshold', 'certificateThreshold', 'nextValidators'],
	properties: {
		events: {
			fieldNumber: 1,
			type: 'array',
			items: {
				...eventSchema,
			},
		},
		preCommitThreshold: {
			fieldNumber: 2,
			dataType: 'uint64',
		},
		certificateThreshold: {
			fieldNumber: 3,
			dataType: 'uint64',
		},
		nextValidators: {
			fieldNumber: 4,
			type: 'array',
			items: {
				...validatorSchema,
			},
		},
	},
};

export const insertAssetsRequestSchema = {
	$id: '/abi/insertAssetsRequest',
	type: 'object',
	required: ['contextID', 'finalizedHeight'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		finalizedHeight: {
			fieldNumber: 2,
			dataType: 'uint32',
		},
	},
};

export const insertAssetsResponseSchema = {
	$id: '/abi/insertAssetsResponse',
	type: 'object',
	required: ['assets'],
	properties: {
		assets: {
			fieldNumber: 1,
			type: 'array',
			items: {
				...blockAssetSchema,
			},
		},
	},
};

export const verifyAssetsRequestSchema = {
	$id: '/abi/verifyAssetsRequest',
	type: 'object',
	required: ['contextID', 'assets'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		assets: {
			fieldNumber: 2,
			type: 'array',
			items: {
				...blockAssetSchema,
			},
		},
	},
};

export const verifyAssetsResponseSchema = {
	$id: '/abi/verifyAssetsResponse',
	type: 'object',
	properties: {},
};

export const beforeTransactionsExecuteRequestSchema = {
	$id: '/abi/beforeTransactionsExecuteRequest',
	type: 'object',
	required: ['contextID', 'assets'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		assets: {
			fieldNumber: 2,
			type: 'array',
			items: {
				...blockAssetSchema,
			},
		},
	},
};

export const beforeTransactionsExecuteResponseSchema = {
	$id: '/abi/beforeTransactionsExecuteResponse',
	type: 'object',
	required: ['events'],
	properties: {
		events: {
			fieldNumber: 1,
			type: 'array',
			items: {
				...eventSchema,
			},
		},
	},
};

export const afterTransactionsExecuteRequestSchema = {
	$id: '/abi/afterTransactionsExecuteRequest',
	type: 'object',
	required: ['contextID', 'assets', 'transactions'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		assets: {
			fieldNumber: 2,
			type: 'array',
			items: {
				...blockAssetSchema,
			},
		},
		transactions: {
			fieldNumber: 3,
			type: 'array',
			items: {
				...transactionSchema,
			},
		},
	},
};

export const afterTransactionsExecuteResponseSchema = {
	$id: '/abi/afterTransactionsExecuteResponse',
	type: 'object',
	required: ['events', 'preCommitThreshold', 'certificateThreshold', 'nextValidators'],
	properties: {
		events: {
			fieldNumber: 1,
			type: 'array',
			items: {
				...eventSchema,
			},
		},
		preCommitThreshold: {
			fieldNumber: 2,
			dataType: 'uint64',
		},
		certificateThreshold: {
			fieldNumber: 3,
			dataType: 'uint64',
		},
		nextValidators: {
			fieldNumber: 4,
			type: 'array',
			items: {
				...validatorSchema,
			},
		},
	},
};

export const verifyTransactionRequestSchema = {
	$id: '/abi/verifyTransactionRequest',
	type: 'object',
	required: ['contextID', 'transaction', 'header'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		transaction: {
			fieldNumber: 2,
			...transactionSchema,
		},
		header: {
			fieldNumber: 3,
			...blockHeaderSchema,
		},
	},
};

export const verifyTransactionResponseSchema = {
	$id: '/abi/verifyTransactionResponse',
	type: 'object',
	required: ['result', 'errorMessage'],
	properties: {
		result: {
			fieldNumber: 1,
			dataType: 'sint32',
		},
		errorMessage: {
			fieldNumber: 2,
			dataType: 'string',
		},
	},
};

export const executeTransactionRequestSchema = {
	$id: '/abi/executeTransactionRequest',
	type: 'object',
	required: ['contextID', 'transaction', 'assets', 'dryRun', 'header'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		transaction: {
			fieldNumber: 2,
			...transactionSchema,
		},
		assets: {
			fieldNumber: 3,
			type: 'array',
			items: {
				...blockAssetSchema,
			},
		},
		dryRun: {
			fieldNumber: 4,
			dataType: 'boolean',
		},
		header: {
			fieldNumber: 5,
			...blockHeaderSchema,
		},
	},
};

export const executeTransactionResponseSchema = {
	$id: '/abi/executeTransactionResponse',
	type: 'object',
	required: ['events', 'result'],
	properties: {
		events: {
			fieldNumber: 1,
			type: 'array',
			items: {
				...eventSchema,
			},
		},
		result: {
			fieldNumber: 2,
			dataType: 'sint32',
		},
	},
};

export const commitRequestSchema = {
	$id: '/abi/commitRequest',
	type: 'object',
	required: ['contextID', 'stateRoot', 'expectedStateRoot', 'dryRun'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		stateRoot: {
			fieldNumber: 2,
			dataType: 'bytes',
		},
		expectedStateRoot: {
			fieldNumber: 3,
			dataType: 'bytes',
		},
		dryRun: {
			fieldNumber: 4,
			dataType: 'boolean',
		},
	},
};

export const commitResponseSchema = {
	$id: '/abi/commitResponse',
	type: 'object',
	required: ['stateRoot'],
	properties: {
		stateRoot: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const revertRequestSchema = {
	$id: '/abi/revertRequest',
	type: 'object',
	required: ['contextID', 'stateRoot', 'expectedStateRoot'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		stateRoot: {
			fieldNumber: 2,
			dataType: 'bytes',
		},
		expectedStateRoot: {
			fieldNumber: 3,
			dataType: 'bytes',
		},
	},
};

export const revertResponseSchema = {
	$id: '/abi/revertResponse',
	type: 'object',
	required: ['stateRoot'],
	properties: {
		stateRoot: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const finalizeRequestSchema = {
	$id: '/abi/finalizeRequest',
	type: 'object',
	required: ['finalizedHeight'],
	properties: {
		finalizedHeight: {
			fieldNumber: 1,
			dataType: 'uint32',
		},
	},
};

export const finalizeResponseSchema = {
	$id: '/abi/finalizeResponse',
	type: 'object',
	properties: {},
};

export const clearRequestSchema = {
	$id: '/abi/clearRequest',
	type: 'object',
	required: [],
	properties: {},
};

export const clearResponseSchema = {
	$id: '/abi/clearResponse',
	type: 'object',
	properties: {},
};

export const metadataRequestSchema = {
	$id: '/abi/metadataRequest',
	type: 'object',
	properties: {},
};

export const metadataResponseSchema = {
	$id: '/abi/metadataResponse',
	type: 'object',
	required: ['data'],
	properties: {
		data: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const queryRequestSchema = {
	$id: '/abi/queryRequest',
	type: 'object',
	required: ['method', 'params', 'header'],
	properties: {
		method: {
			fieldNumber: 1,
			dataType: 'string',
		},
		params: {
			fieldNumber: 2,
			dataType: 'bytes',
		},
		header: {
			fieldNumber: 3,
			...blockHeaderSchema,
		},
	},
};

export const queryResponseSchema = {
	$id: '/abi/queryResponse',
	type: 'object',
	required: ['data'],
	properties: {
		data: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const proveRequestSchema = {
	$id: '/abi/proveRequest',
	type: 'object',
	required: ['stateRoot', 'keys'],
	properties: {
		stateRoot: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		keys: {
			fieldNumber: 2,
			type: 'array',
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export const proveResponseSchema = {
	$id: '/abi/proveResponse',
	type: 'object',
	required: ['proof'],
	properties: {
		proof: {
			fieldNumber: 1,
			type: 'object',
			required: ['siblingHashes', 'queries'],
			properties: {
				siblingHashes: {
					fieldNumber: 1,
					type: 'array',
					items: {
						dataType: 'bytes',
					},
				},
				queries: {
					fieldNumber: 2,
					type: 'array',
					items: {
						type: 'object',
						required: ['key', 'value', 'bitmap'],
						properties: {
							key: {
								fieldNumber: 1,
								dataType: 'bytes',
							},
							value: {
								fieldNumber: 2,
								dataType: 'bytes',
							},
							bitmap: {
								fieldNumber: 3,
								dataType: 'bytes',
							},
						},
					},
				},
			},
		},
	},
};

export const ipcRequestSchema = {
	$id: '/abi/ipcRequest',
	type: 'object',
	required: ['id', 'method', 'params'],
	properties: {
		id: {
			fieldNumber: 1,
			dataType: 'uint64',
		},
		method: {
			fieldNumber: 2,
			dataType: 'string',
		},
		params: {
			fieldNumber: 3,
			dataType: 'bytes',
		},
	},
};

export const ipcResponseSchema = {
	$id: '/abi/ipcResponse',
	type: 'object',
	required: ['id', 'success', 'error', 'result'],
	properties: {
		id: {
			fieldNumber: 1,
			dataType: 'uint64',
		},
		success: {
			fieldNumber: 2,
			dataType: 'boolean',
		},
		error: {
			type: 'object',
			fieldNumber: 3,
			required: ['message'],
			properties: {
				message: {
					fieldNumber: 1,
					dataType: 'string',
				},
			},
		},
		result: {
			fieldNumber: 4,
			dataType: 'bytes',
		},
	},
};

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

export { blockHeaderSchema, blockSchema };

export const eventSchema = {
	$id: '/block/event',
	type: 'object',
	required: ['moduleID', 'typeID', 'data', 'topics', 'index'],
	properties: {
		moduleID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		typeID: {
			dataType: 'bytes',
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
				maxItems: 4,
				dataType: 'bytes',
			},
		},
		index: {
			dataType: 'uint32',
			fieldNumber: 5,
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

export const consensusSchema = {
	$id: '/abi/consensus',
	type: 'object',
	required: ['currentValidators', 'implyMaxPrevote', 'maxHeightCertified'],
	properties: {
		currentValidators: {
			fieldNumber: 1,
			type: 'array',
			items: {
				...validatorSchema,
			},
		},
		implyMaxPrevote: {
			fieldNumber: 2,
			dataType: 'boolean',
		},
		maxHeightCertified: {
			fieldNumber: 3,
			dataType: 'uint32',
		},
		certificateThreshold: {
			fieldNumber: 4,
			dataType: 'uint64',
		},
	},
};

export const initRequestSchema = {
	$id: '/abi/initRequest',
	type: 'object',
	properties: {},
};

export const networkPeerSchema = {
	type: 'object',
	required: ['ip', 'port'],
	properties: {
		ip: {
			fieldNumber: 1,
			dataType: 'string',
		},
		port: {
			fieldNumber: 2,
			dataType: 'uint32',
		},
	},
};

const systemConfigSchema = {
	type: 'object',
	required: ['version', 'networkVersion', 'dataPath', 'maxBlockCache', 'keepEventsForHeights'],
	properties: {
		version: {
			fieldNumber: 1,
			dataType: 'string',
		},
		networkVersion: {
			fieldNumber: 2,
			dataType: 'string',
		},
		dataPath: {
			fieldNumber: 3,
			dataType: 'string',
		},
		maxBlockCache: {
			fieldNumber: 4,
			dataType: 'uint32',
		},
		keepEventsForHeights: {
			fieldNumber: 5,
			dataType: 'uint32',
		},
	},
};

const rpcConfigSchema = {
	type: 'object',
	required: ['modes', 'host', 'port'],
	properties: {
		modes: {
			fieldNumber: 1,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		host: {
			fieldNumber: 2,
			dataType: 'string',
		},
		port: {
			fieldNumber: 3,
			dataType: 'uint32',
		},
	},
};

const loggerConfigSchema = {
	type: 'object',
	required: ['consoleLogLevel', 'fileLogLevel'],
	properties: {
		consoleLogLevel: {
			fieldNumber: 1,
			dataType: 'string',
		},
		fileLogLevel: {
			fieldNumber: 2,
			dataType: 'string',
		},
	},
};

const genesisConfigSchema = {
	type: 'object',
	required: [
		'communityIdentifier',
		'maxTransactionsSize',
		'minFeePerByte',
		'blockTime',
		'bftBatchSize',
	],
	properties: {
		communityIdentifier: {
			fieldNumber: 1,
			dataType: 'string',
		},
		maxTransactionsSize: {
			fieldNumber: 2,
			dataType: 'uint32',
		},
		minFeePerByte: {
			fieldNumber: 3,
			dataType: 'uint32',
		},
		blockTime: {
			fieldNumber: 4,
			dataType: 'uint32',
		},
		bftBatchSize: {
			fieldNumber: 5,
			dataType: 'uint32',
		},
	},
};

const networkConfigSchema = {
	type: 'object',
	required: [
		'port',
		'hostIP',
		'seedPeers',
		'fixedPeers',
		'whitelistedPeers',
		'blacklistedIPs',
		'maxOutboundConnections',
		'maxInboundConnections',
		'advertiseAddress',
	],
	properties: {
		port: {
			fieldNumber: 1,
			dataType: 'uint32',
		},
		hostIP: {
			fieldNumber: 2,
			dataType: 'string',
		},
		seedPeers: {
			fieldNumber: 3,
			type: 'array',
			items: {
				...networkPeerSchema,
			},
		},
		fixedPeers: {
			fieldNumber: 4,
			type: 'array',
			items: {
				...networkPeerSchema,
			},
		},
		whitelistedPeers: {
			fieldNumber: 5,
			type: 'array',
			items: {
				...networkPeerSchema,
			},
		},
		blacklistedIPs: {
			fieldNumber: 6,
			type: 'array',
			items: {
				dataType: 'string',
			},
		},
		maxOutboundConnections: {
			fieldNumber: 7,
			dataType: 'uint32',
		},
		maxInboundConnections: {
			fieldNumber: 8,
			dataType: 'uint32',
		},
		advertiseAddress: {
			fieldNumber: 9,
			dataType: 'boolean',
		},
	},
};

const txpoolConfigSchema = {
	type: 'object',
	required: [
		'maxTransactions',
		'maxTransactionsPerAccount',
		'transactionExpiryTime',
		'minEntranceFeePriority',
		'minReplacementFeeDifference',
	],
	properties: {
		maxTransactions: {
			fieldNumber: 1,
			dataType: 'uint32',
		},
		maxTransactionsPerAccount: {
			fieldNumber: 2,
			dataType: 'uint32',
		},
		transactionExpiryTime: {
			fieldNumber: 3,
			dataType: 'uint32',
		},
		minEntranceFeePriority: {
			fieldNumber: 4,
			dataType: 'uint64',
		},
		minReplacementFeeDifference: {
			fieldNumber: 5,
			dataType: 'uint64',
		},
	},
};

const generatorConfigSchema = {
	type: 'object',
	required: ['password', 'force', 'keys'],
	properties: {
		password: {
			fieldNumber: 1,
			dataType: 'string',
		},
		force: {
			fieldNumber: 2,
			dataType: 'boolean',
		},
		keys: {
			fieldNumber: 3,
			type: 'array',
			items: {
				type: 'object',
				required: ['address', 'encryptedPassphrase'],
				properties: {
					address: {
						fieldNumber: 1,
						dataType: 'bytes',
					},
					encryptedPassphrase: {
						fieldNumber: 2,
						dataType: 'string',
					},
				},
			},
		},
	},
};

export const initResponseSchema = {
	$id: '/abi/initResponse',
	type: 'object',
	required: ['registeredModules', 'genesisBlock', 'config'],
	properties: {
		registeredModules: {
			fieldNumber: 1,
			type: 'array',
			items: {
				type: 'object',
				properties: {
					moduleID: {
						fieldNumber: 1,
						dataType: 'bytes',
					},
					commandIDs: {
						fieldNumber: 2,
						type: 'array',
						items: {
							dataType: 'bytes',
						},
					},
				},
			},
		},
		genesisBlock: {
			fieldNumber: 2,
			type: 'object',
			properties: {
				header: {
					fieldNumber: 1,
					...blockHeaderSchema,
				},
				transactions: {
					type: 'array',
					fieldNumber: 2,
					items: {
						...transactionSchema,
					},
				},
				assets: {
					type: 'array',
					items: {
						type: 'object',
						required: ['moduleID', 'data'],
						properties: {
							moduleID: {
								dataType: 'bytes',
								fieldNumber: 1,
							},
							data: {
								dataType: 'bytes',
								fieldNumber: 2,
							},
						},
					},
					fieldNumber: 3,
				},
			},
		},
		config: {
			fieldNumber: 3,
			type: 'object',
			properties: {
				system: {
					fieldNumber: 1,
					...systemConfigSchema,
				},
				rpc: {
					fieldNumber: 2,
					...rpcConfigSchema,
				},
				logger: {
					fieldNumber: 3,
					...loggerConfigSchema,
				},
				genesis: {
					fieldNumber: 4,
					...genesisConfigSchema,
				},
				network: {
					fieldNumber: 5,
					...networkConfigSchema,
				},
				txpool: {
					fieldNumber: 6,
					...txpoolConfigSchema,
				},
				generator: {
					fieldNumber: 7,
					...generatorConfigSchema,
				},
			},
		},
	},
};

export const readyRequestSchema = {
	$id: '/abi/readyRequest',
	type: 'object',
	required: ['networkIdentifier', 'lastBlockHeight'],
	properties: {
		networkIdentifier: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		lastBlockHeight: {
			fieldNumber: 2,
			dataType: 'uint32',
		},
	},
};

export const readyResponseSchema = {
	$id: '/abi/readyResponse',
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
	required: ['assets', 'events', 'preCommitThreshold', 'certificateThreshold', 'nextValidators'],
	properties: {
		assets: {
			fieldNumber: 1,
			type: 'array',
			items: {
				...blockAssetSchema,
			},
		},
		events: {
			fieldNumber: 2,
			type: 'array',
			items: {
				...eventSchema,
			},
		},
		preCommitThreshold: {
			fieldNumber: 3,
			dataType: 'uint64',
		},
		certificateThreshold: {
			fieldNumber: 4,
			dataType: 'uint64',
		},
		nextValidators: {
			fieldNumber: 5,
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
	required: ['contextID', 'assets', 'consensus'],
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
		consensus: {
			fieldNumber: 3,
			...consensusSchema,
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
	required: ['contextID', 'assets', 'consensus', 'transactions'],
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
		consensus: {
			fieldNumber: 3,
			...consensusSchema,
		},
		transactions: {
			fieldNumber: 4,
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
	required: ['contextID', 'transaction'],
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		transaction: {
			fieldNumber: 2,
			...transactionSchema,
		},
	},
};

export const verifyTransactionResponseSchema = {
	$id: '/abi/verifyTransactionResponse',
	type: 'object',
	required: ['result'],
	properties: {
		result: {
			fieldNumber: 1,
			dataType: 'sint32',
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
		consensus: {
			fieldNumber: 6,
			...consensusSchema,
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
	required: ['finalizedHeight'],
	properties: {
		finalizedHeight: {
			fieldNumber: 1,
			dataType: 'uint32',
		},
	},
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

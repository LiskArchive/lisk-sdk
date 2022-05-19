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
	$id: 'abi/validator',
	type: 'object',
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
	$id: 'abi/consensus',
	type: 'object',
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
	},
};

export const initRequestSchema = {
	$id: 'abi/initRequest',
	type: 'object',
	properties: {},
};

export const networkPeerSchema = {
	$id: 'abi/networkPeer',
	type: 'object',
	properties: {
		ip: {
			fieldNumber: 1,
			dataType: 'string',
		},
		host: {
			fieldNumber: 2,
			dataType: 'uint32',
		},
	},
};

export const initResponseSchema = {
	$id: 'abi/initResponse',
	type: 'object',
	properties: {
		registeredModules: {
			fieldNumber: 1,
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
		genesisBlock: {
			fieldNumber: 2,
			...blockSchema,
		},
		config: {
			fieldNumber: 3,
			type: 'object',
			properties: {
				system: {
					fieldNumber: 1,
					type: 'object',
					properties: {
						networkVersion: {
							fieldNumber: 1,
							dataType: 'string',
						},
						dataPath: {
							fieldNumber: 2,
							dataType: 'string',
						},
						maxBlockCache: {
							fieldNumber: 3,
							dataType: 'uint32',
						},
					},
				},
				rpc: {
					fieldNumber: 2,
					type: 'object',
					properties: {
						modes: {
							fieldNumber: 1,
							type: 'array',
							items: {
								dataType: 'string',
							},
						},
						ipc: {
							fieldNumber: 2,
							type: 'object',
							properties: {
								path: {
									fieldNumber: 1,
									dataType: 'string',
								},
							},
						},
						ws: {
							fieldNumber: 2,
							type: 'object',
							properties: {
								host: {
									fieldNumber: 1,
									dataType: 'string',
								},
								port: {
									fieldNumber: 2,
									dataType: 'uint32',
								},
							},
						},
						http: {
							fieldNumber: 3,
							type: 'object',
							properties: {
								host: {
									fieldNumber: 1,
									dataType: 'string',
								},
								port: {
									fieldNumber: 2,
									dataType: 'uint32',
								},
							},
						},
					},
				},
				logger: {
					fieldNumber: 3,
					type: 'object',
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
				},
				genesis: {
					fieldNumber: 4,
					type: 'object',
					properties: {
						communityIdentifier: {
							fieldNumber: 1,
							dataType: 'string',
						},
						maxTransactionsSize: {
							fieldNumber: 2,
							dataType: 'uint32',
						},
						maxFeePerByte: {
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
				},
				network: {
					fieldNumber: 5,
					type: 'object',
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
							...networkPeerSchema,
						},
						fixedPeers: {
							fieldNumber: 4,
							...networkPeerSchema,
						},
						whitelistedPeers: {
							fieldNumber: 5,
							...networkPeerSchema,
						},
						blackListedIPs: {
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
				},
				txpool: {
					fieldNumber: 6,
					type: 'object',
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
							dataType: 'uint32',
						},
						minReplacementFeeDifference: {
							fieldNumber: 5,
							dataType: 'uint32',
						},
					},
				},
				generator: {
					fieldNumber: 7,
					type: 'object',
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
				},
			},
		},
	},
};

export const initStateMachineRequestSchema = {
	$id: 'abi/initStateMachineRequest',
	type: 'object',
	properties: {
		networkIdentifier: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		header: {
			fieldNumber: 2,
			...blockHeaderSchema,
		},
	},
};

export const initStateMachineResponseSchema = {
	$id: 'abi/initStateMachineResponse',
	type: 'object',
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const initGenesisStateRequestSchema = {
	$id: 'abi/initGenesisStateRequest',
	type: 'object',
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const initGenesisStateResponseSchema = {
	$id: 'abi/initGenesisStateResponse',
	type: 'object',
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
			dataType: 'uint32',
		},
		certificateThreshold: {
			fieldNumber: 4,
			dataType: 'uint32',
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
	$id: 'abi/insertAssetsRequest',
	type: 'object',
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
	$id: 'abi/insertAssetsResponse',
	type: 'object',
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
	$id: 'abi/verifyAssetsRequest',
	type: 'object',
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
	$id: 'abi/verifyAssetsResponse',
	type: 'object',
	properties: {},
};

export const beforeTransactionsExecuteRequestSchema = {
	$id: 'abi/beforeTransactionsExecuteRequest',
	type: 'object',
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
	$id: 'abi/beforeTransactionsExecuteResponse',
	type: 'object',
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
	$id: 'abi/afterTransactionsExecuteRequest',
	type: 'object',
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
	$id: 'abi/afterTransactionsExecuteResponse',
	type: 'object',
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
	$id: 'abi/verifyTransactionRequest',
	type: 'object',
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		networkIdentifier: {
			fieldNumber: 2,
			dataType: 'bytes',
		},
		transaction: {
			fieldNumber: 3,
			...transactionSchema,
		},
	},
};

export const verifyTransactionResponseSchema = {
	$id: 'abi/verifyTransactionResponse',
	type: 'object',
	properties: {
		result: {
			fieldNumber: 1,
			dataType: 'uint32',
		},
	},
};

export const executeTransactionRequestSchema = {
	$id: 'abi/executeTransactionRequest',
	type: 'object',
	properties: {
		contextID: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
		networkIdentifier: {
			fieldNumber: 2,
			dataType: 'bytes',
		},
		transaction: {
			fieldNumber: 3,
			...transactionSchema,
		},
		assets: {
			fieldNumber: 4,
			type: 'array',
			items: {
				...blockAssetSchema,
			},
		},
		dryRun: {
			fieldNumber: 5,
			dataType: 'boolean',
		},
		header: {
			fieldNumber: 6,
			...blockHeaderSchema,
		},
	},
};

export const executeTransactionResponseSchema = {
	$id: 'abi/executeTransactionResponse',
	type: 'object',
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
			dataType: 'uint32',
		},
	},
};

export const commitRequestSchema = {
	$id: 'abi/commitRequest',
	type: 'object',
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
	$id: 'abi/commitResponse',
	type: 'object',
	properties: {
		stateRoot: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const revertRequestSchema = {
	$id: 'abi/revertRequest',
	type: 'object',
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
	$id: 'abi/revertResponse',
	type: 'object',
	properties: {
		stateRoot: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const finalizeRequestSchema = {
	$id: 'abi/finalizeRequest',
	type: 'object',
	properties: {
		finalizedHeight: {
			fieldNumber: 1,
			dataType: 'uint32',
		},
	},
};

export const finalizeResponseSchema = {
	$id: 'abi/finalizeResponse',
	type: 'object',
	properties: {},
};

export const clearRequestSchema = {
	$id: 'abi/clearRequest',
	type: 'object',
	properties: {
		finalizedHeight: {
			fieldNumber: 1,
			dataType: 'uint32',
		},
	},
};

export const clearResponseSchema = {
	$id: 'abi/clearResponse',
	type: 'object',
	properties: {},
};

export const metadataRequestSchema = {
	$id: 'abi/metadataRequest',
	type: 'object',
	properties: {},
};

export const metadataResponseSchema = {
	$id: 'abi/metadataResponse',
	type: 'object',
	properties: {
		data: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const queryRequestSchema = {
	$id: 'abi/queryRequest',
	type: 'object',
	properties: {
		method: {
			fieldNumber: 1,
			dataType: 'string',
		},
		params: {
			fieldNumber: 2,
			dataType: 'bytes',
		},
		networkIdentifier: {
			fieldNumber: 3,
			dataType: 'bytes',
		},
		header: {
			fieldNumber: 4,
			...blockHeaderSchema,
		},
	},
};

export const queryResponseSchema = {
	$id: 'abi/queryResponse',
	type: 'object',
	properties: {
		data: {
			fieldNumber: 1,
			dataType: 'bytes',
		},
	},
};

export const proveRequestSchema = {
	$id: 'abi/proveRequest',
	type: 'object',
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
	$id: 'abi/proveResponse',
	type: 'object',
	properties: {
		proof: {
			fieldNumber: 1,
			type: 'object',
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
	$id: 'abi/ipcRequest',
	type: 'object',
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
	$id: 'abi/ipcResponse',
	type: 'object',
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

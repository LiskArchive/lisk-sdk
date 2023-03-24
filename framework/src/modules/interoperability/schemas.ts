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

import { CHAIN_ID_LENGTH, TOKEN_ID_LENGTH } from '../token/constants';
import {
	MAX_NUM_VALIDATORS,
	MIN_CHAIN_NAME_LENGTH,
	MAX_CHAIN_NAME_LENGTH,
	BLS_PUBLIC_KEY_LENGTH,
	BLS_SIGNATURE_LENGTH,
	MAX_MODULE_NAME_LENGTH,
	MIN_MODULE_NAME_LENGTH,
	MIN_CROSS_CHAIN_COMMAND_NAME_LENGTH,
	MAX_CROSS_CHAIN_COMMAND_NAME_LENGTH,
	HASH_LENGTH,
	NUMBER_ACTIVE_VALIDATORS_MAINCHAIN,
} from './constants';
import { chainDataSchema } from './stores/chain_account';
import { chainValidatorsSchema } from './stores/chain_validators';
import { channelSchema } from './stores/channel_data';

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#cross-chain-message-schema
export const ccmSchema = {
	$id: '/modules/interoperability/ccm',
	type: 'object',
	required: [
		'module',
		'crossChainCommand',
		'nonce',
		'fee',
		'sendingChainID',
		'receivingChainID',
		'params',
		'status',
	],
	properties: {
		module: {
			dataType: 'string',
			minLength: MIN_MODULE_NAME_LENGTH,
			maxLength: MAX_MODULE_NAME_LENGTH,
			fieldNumber: 1,
		},
		crossChainCommand: {
			dataType: 'string',
			minLength: MIN_CROSS_CHAIN_COMMAND_NAME_LENGTH,
			maxLength: MAX_CROSS_CHAIN_COMMAND_NAME_LENGTH,
			fieldNumber: 2,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		fee: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		sendingChainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 5,
		},
		receivingChainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 6,
		},
		params: {
			dataType: 'bytes',
			fieldNumber: 7,
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 8,
		},
	},
};

const activeChainValidatorsSchema = {
	type: 'array',
	items: {
		type: 'object',
		required: ['blsKey', 'bftWeight'],
		properties: {
			blsKey: {
				dataType: 'bytes',
				fieldNumber: 1,
				minLength: BLS_PUBLIC_KEY_LENGTH,
				maxLength: BLS_PUBLIC_KEY_LENGTH,
			},
			bftWeight: {
				dataType: 'uint64',
				fieldNumber: 2,
			},
		},
	},
	minItems: 1,
	// maxItems: MAX_NUM_VALIDATORS,
};

export const sidechainRegParams = {
	$id: '/modules/interoperability/mainchain/sidechainRegistration',
	type: 'object',
	required: ['chainID', 'name', 'sidechainValidators', 'sidechainCertificateThreshold'],
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		name: {
			dataType: 'string',
			fieldNumber: 2,
			minLength: MIN_CHAIN_NAME_LENGTH,
			maxLength: MAX_CHAIN_NAME_LENGTH,
		},
		sidechainValidators: {
			...activeChainValidatorsSchema,
			fieldNumber: 3,
			maxItems: MAX_NUM_VALIDATORS,
		},
		sidechainCertificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
	},
};

export const mainchainRegParams = {
	$id: '/modules/interoperability/sidechain/mainchainRegistration',
	type: 'object',
	required: [
		'ownChainID',
		'ownName',
		'mainchainValidators',
		'mainchainCertificateThreshold',
		'signature',
		'aggregationBits',
	],
	properties: {
		ownChainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		ownName: {
			dataType: 'string',
			fieldNumber: 2,
			minLength: MIN_CHAIN_NAME_LENGTH,
			maxLength: MAX_CHAIN_NAME_LENGTH,
		},
		mainchainValidators: {
			...activeChainValidatorsSchema,
			fieldNumber: 3,
			maxItems: NUMBER_ACTIVE_VALIDATORS_MAINCHAIN,
		},
		mainchainCertificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		signature: {
			dataType: 'bytes',
			fieldNumber: 5,
			minItems: BLS_SIGNATURE_LENGTH,
			maxItems: BLS_SIGNATURE_LENGTH,
		},
		aggregationBits: {
			dataType: 'bytes',
			fieldNumber: 6,
		},
	},
};

export const crossChainUpdateTransactionParams = {
	$id: '/modules/interoperability/ccu',
	type: 'object',
	required: [
		'sendingChainID',
		'certificate',
		'activeValidatorsUpdate',
		'certificateThreshold',
		'inboxUpdate',
	],
	properties: {
		sendingChainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		certificate: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		activeValidatorsUpdate: {
			type: 'object',
			fieldNumber: 3,
			required: ['blsKeysUpdate', 'bftWeightsUpdate', 'bftWeightsUpdateBitmap'],
			properties: {
				blsKeysUpdate: {
					type: 'array',
					fieldNumber: 1,
					items: {
						dataType: 'bytes',
						minLength: BLS_PUBLIC_KEY_LENGTH,
						maxLength: BLS_PUBLIC_KEY_LENGTH,
					},
				},
				bftWeightsUpdate: {
					type: 'array',
					fieldNumber: 2,
					items: {
						dataType: 'uint64',
					},
				},
				bftWeightsUpdateBitmap: {
					dataType: 'bytes',
					fieldNumber: 3,
				},
			},
		},
		certificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		inboxUpdate: {
			type: 'object',
			fieldNumber: 5,
			required: ['crossChainMessages', 'messageWitnessHashes', 'outboxRootWitness'],
			properties: {
				crossChainMessages: {
					type: 'array',
					fieldNumber: 1,
					items: { dataType: 'bytes' },
				},
				messageWitnessHashes: {
					type: 'array',
					fieldNumber: 2,
					items: {
						dataType: 'bytes',
						minLength: HASH_LENGTH,
						maxLength: HASH_LENGTH,
					},
				},
				outboxRootWitness: {
					type: 'object',
					fieldNumber: 3,
					required: ['bitmap', 'siblingHashes'],
					properties: {
						bitmap: {
							dataType: 'bytes',
							fieldNumber: 1,
						},
						siblingHashes: {
							type: 'array',
							fieldNumber: 2,
							items: {
								dataType: 'bytes',
								minLength: HASH_LENGTH,
								maxLength: HASH_LENGTH,
							},
						},
					},
				},
			},
		},
	},
};

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#parameters-1
export const messageRecoveryParamsSchema = {
	$id: '/modules/interoperability/mainchain/messageRecovery',
	type: 'object',
	required: ['chainID', 'crossChainMessages', 'idxs', 'siblingHashes'],
	properties: {
		chainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 1,
		},
		crossChainMessages: {
			type: 'array',
			minItems: 1,
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
		},
		idxs: {
			type: 'array',
			items: {
				dataType: 'uint32',
			},
			fieldNumber: 3,
		},
		siblingHashes: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: HASH_LENGTH,
				maxLength: HASH_LENGTH,
			},
			fieldNumber: 4,
		},
	},
};

export const messageRecoveryInitializationParamsSchema = {
	$id: '/modules/interoperability/mainchain/messageRecoveryInitialization',
	type: 'object',
	required: ['chainID', 'channel', 'bitmap', 'siblingHashes'],
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		channel: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		bitmap: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		siblingHashes: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: HASH_LENGTH,
				maxLength: HASH_LENGTH,
			},
			fieldNumber: 4,
		},
	},
};

// Cross chain commands schemas
// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#parameters-2
export const registrationCCMParamsSchema = {
	$id: '/modules/interoperability/ccCommand/registration',
	type: 'object',
	required: ['name', 'chainID', 'messageFeeTokenID', 'minReturnFeePerByte'],
	properties: {
		name: {
			dataType: 'string',
			minLength: MIN_CHAIN_NAME_LENGTH,
			maxLength: MAX_CHAIN_NAME_LENGTH,
			fieldNumber: 1,
		},
		chainID: {
			dataType: 'bytes',
			fieldNumber: 2,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 3,
		},
		minReturnFeePerByte: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
	},
};

export const sidechainTerminatedCCMParamsSchema = {
	$id: '/modules/interoperability/ccCommand/sidechainTerminated',
	type: 'object',
	required: ['chainID', 'stateRoot'],
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		stateRoot: {
			dataType: 'bytes',
			fieldNumber: 2,
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
		},
	},
};

export const validatorsHashInputSchema = {
	$id: '/modules/interoperability/validatorsHashInput',
	type: 'object',
	required: ['activeValidators', 'certificateThreshold'],
	properties: {
		activeValidators: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['blsKey', 'bftWeight'],
				properties: {
					blsKey: { dataType: 'bytes', fieldNumber: 1 },
					bftWeight: { dataType: 'uint64', fieldNumber: 2 },
				},
			},
		},
		certificateThreshold: { dataType: 'uint64', fieldNumber: 2 },
	},
};

export const registrationSignatureMessageSchema = {
	$id: '/modules/interoperability/sidechain/registrationSignatureMessage',
	type: 'object',
	required: ['ownChainID', 'ownName', 'mainchainValidators', 'mainchainCertificateThreshold'],
	properties: {
		ownChainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		ownName: {
			dataType: 'string',
			fieldNumber: 2,
			minLength: MIN_CHAIN_NAME_LENGTH,
			maxLength: MAX_CHAIN_NAME_LENGTH,
		},
		mainchainValidators: {
			...activeChainValidatorsSchema,
			fieldNumber: 3,
			maxItems: NUMBER_ACTIVE_VALIDATORS_MAINCHAIN,
		},
		mainchainCertificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
	},
};

export const stateRecoveryParamsSchema = {
	$id: '/modules/interoperability/mainchain/commands/stateRecovery',
	type: 'object',
	required: ['chainID', 'module', 'storeEntries', 'siblingHashes'],
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		module: {
			dataType: 'string',
			fieldNumber: 2,
		},
		storeEntries: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				properties: {
					substorePrefix: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
					storeValue: {
						dataType: 'bytes',
						fieldNumber: 3,
					},
					bitmap: {
						dataType: 'bytes',
						fieldNumber: 4,
					},
				},
				required: ['substorePrefix', 'storeKey', 'storeValue', 'bitmap'],
			},
		},
		siblingHashes: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 4,
		},
	},
};

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#parameters-3
export const stateRecoveryInitParamsSchema = {
	$id: '/modules/interoperability/mainchain/stateRecoveryInitialization',
	type: 'object',
	required: ['chainID', 'sidechainAccount', 'bitmap', 'siblingHashes'],
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		sidechainAccount: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		bitmap: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		siblingHashes: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: HASH_LENGTH,
				maxLength: HASH_LENGTH,
			},
			fieldNumber: 4,
		},
	},
};

export const terminateSidechainForLivenessParamsSchema = {
	$id: '/modules/interoperability/mainchain/terminateSidechainForLiveness',
	type: 'object',
	required: ['chainID'],
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
	},
};

export const getChainAccountRequestSchema = {
	$id: '/modules/interoperability/endpoint/getChainAccountRequest',
	type: 'object',
	required: ['chainID'],
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
};

export const getChainAccountResponseSchema = {
	$id: '/modules/interoperability/endpoint/getChainAccountResponse',
	type: 'object',
	required: ['chainID'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
	},
};

export const getChainValidatorsRequestSchema = getChainAccountRequestSchema;

export const getChainValidatorsResponseSchema = validatorsHashInputSchema;

export const isChainIDAvailableRequestSchema = getChainAccountRequestSchema;

export const isChainIDAvailableResponseSchema = {
	$id: '/modules/interoperability/endpoint/isChainIDAvailableResponseSchema',
	type: 'object',
	required: ['result'],
	properties: {
		result: {
			type: 'boolean',
		},
	},
};

export const isChainNameAvailableRequestSchema = {
	$id: '/modules/interoperability/endpoint/isChainNameAvailableRequest',
	type: 'object',
	required: ['name'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
	},
};

export const isChainNameAvailableResponseSchema = {
	...isChainIDAvailableResponseSchema,
	$id: '/modules/interoperability/endpoint/isChainNameAvailableResponseSchema',
};

export const getChannelRequestSchema = getChainAccountRequestSchema;

export const getTerminatedStateAccountRequestSchema = getChainAccountRequestSchema;

export const getTerminatedOutboxAccountRequestSchema = getChainAccountRequestSchema;

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#genesis-assets-schema
export const genesisInteroperabilitySchema = {
	$id: '/interoperability/module/genesis',
	type: 'object',
	required: [
		'ownChainName',
		'ownChainNonce',
		'chainInfos',
		/* 'terminatedStateAccounts',
		'terminatedOutboxAccounts', */
	],
	properties: {
		ownChainName: {
			dataType: 'string',
			maxLength: MAX_CHAIN_NAME_LENGTH,
			fieldNumber: 1,
		},
		ownChainNonce: {
			dataType: 'uint64',
			fieldNumber: 2,
		},

		chainInfos: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				required: ['chainID', 'chainData', 'channelData', 'chainValidators'],
				properties: {
					chainID: {
						dataType: 'bytes',
						minLength: CHAIN_ID_LENGTH,
						maxLength: CHAIN_ID_LENGTH,
						fieldNumber: 1,
					},
					chainData: {
						...chainDataSchema,
						fieldNumber: 2,
					},

					channelData: {
						...channelSchema,
						fieldNumber: 3,
					},
					chainValidators: {
						...chainValidatorsSchema,
						fieldNumber: 4,
					},
				},
			},
		},
		/* terminatedStateAccounts: {
			type: 'array',
			fieldNumber: 4,
			items: {
				type: 'object',
				required: ['chainID', 'terminatedStateAccount'],
				properties: {
					chainID: {
						dataType: 'bytes',
						minLength: CHAIN_ID_LENGTH,
						maxLength: CHAIN_ID_LENGTH,
						fieldNumber: 1,
					},
					terminatedStateAccount: {
						...terminatedStateSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		terminatedOutboxAccounts: {
			type: 'array',
			fieldNumber: 5,
			items: {
				type: 'object',
				required: ['chainID', 'terminatedOutboxAccount'],
				properties: {
					chainID: {
						dataType: 'bytes',
						minLength: CHAIN_ID_LENGTH,
						maxLength: CHAIN_ID_LENGTH,
						fieldNumber: 1,
					},
					terminatedOutboxAccount: {
						...terminatedOutboxSchema,
						fieldNumber: 2,
					},
				},
			},
		}, */
	},
};

export const getRegistrationFeeSchema = {
	$id: '/modules/interoperability/mainchain/registrationFee',
	type: 'object',
	required: ['registrationFee'],
	properties: {
		registrationFee: {
			type: 'string',
		},
	},
};

export const getMinimumMessageFeeResponseSchema = {
	$id: '/modules/interoperability/mainchain/minimumMessageFeeResponse',
	type: 'object',
	required: ['fee'],
	properties: {
		fee: {
			type: 'string',
		},
	},
};

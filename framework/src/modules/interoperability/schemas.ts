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
	MAX_LENGTH_NAME,
	NUMBER_MAINCHAIN_VALIDATORS,
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
} from './constants';
import { chainAccountSchema } from './stores/chain_account';
import { chainValidatorsSchema } from './stores/chain_validators';
import { channelSchema } from './stores/channel_data';
import { outboxRootSchema } from './stores/outbox_root';
import { ownChainAccountSchema } from './stores/own_chain_account';
import { chainIDSchema } from './stores/registered_names';
import { terminatedOutboxSchema } from './stores/terminated_outbox';
import { terminatedStateSchema } from './stores/terminated_state';

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

export const sidechainRegParams = {
	$id: '/modules/interoperability/mainchain/sidechainRegistration',
	type: 'object',
	required: ['name', 'chainID', 'initValidators', 'certificateThreshold'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
			minLength: MIN_CHAIN_NAME_LENGTH,
			maxLength: MAX_CHAIN_NAME_LENGTH,
		},
		chainID: {
			dataType: 'bytes',
			fieldNumber: 2,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		initValidators: {
			type: 'array',
			fieldNumber: 3,
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
			maxItems: MAX_NUM_VALIDATORS,
		},
		certificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		sidechainRegistrationFee: {
			dataType: 'uint64',
			fieldNumber: 5,
		},
	},
};

export const mainchainRegParams = {
	$id: '/modules/interoperability/sidechain/mainchainRegistration',
	type: 'object',
	required: ['ownChainID', 'ownName', 'mainchainValidators', 'signature', 'aggregationBits'],
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
			type: 'array',
			fieldNumber: 3,
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
			minItems: NUMBER_MAINCHAIN_VALIDATORS,
			maxItems: NUMBER_MAINCHAIN_VALIDATORS,
		},
		signature: {
			dataType: 'bytes',
			fieldNumber: 4,
			minItems: BLS_SIGNATURE_LENGTH,
			maxItems: BLS_SIGNATURE_LENGTH,
		},
		aggregationBits: {
			dataType: 'bytes',
			fieldNumber: 5,
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
		'newCertificateThreshold',
		'inboxUpdate',
	],
	properties: {
		sendingChainID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		certificate: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		activeValidatorsUpdate: {
			type: 'array',
			fieldNumber: 3,
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
		},
		newCertificateThreshold: {
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

export const messageRecoveryParamsSchema = {
	$id: '/modules/interoperability/mainchain/messageRecovery',
	type: 'object',
	required: ['chainID', 'crossChainMessages', 'idxs', 'siblingHashes'],
	properties: {
		chainID: {
			dataType: 'bytes',
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
			},
			fieldNumber: 4,
		},
	},
};

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#parameters-2
export const registrationCCMParamsSchema = {
	$id: '/modules/interoperability/ccCommand/registration',
	type: 'object',
	required: ['name', 'messageFeeTokenID'],
	properties: {
		name: {
			dataType: 'string',
			fieldNumber: 1,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 2,
		},
	},
};

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#parameters-1
export const channelTerminatedCCMParamsSchema = {
	$id: '/modules/interoperability/ccCommand/channelTerminated',
	type: 'object',
	required: [],
	properties: {},
};

export const sidechainTerminatedCCMParamsSchema = {
	$id: '/modules/interoperability/ccCommand/sidechainTerminated',
	type: 'object',
	required: ['chainID', 'stateRoot'],
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		stateRoot: {
			dataType: 'bytes',
			fieldNumber: 2,
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
	required: ['ownChainID', 'ownName', 'mainchainValidators'],
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
			maxLength: MAX_LENGTH_NAME,
		},
		mainchainValidators: {
			type: 'array',
			fieldNumber: 3,
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
			minItems: NUMBER_MAINCHAIN_VALIDATORS,
			maxItems: NUMBER_MAINCHAIN_VALIDATORS,
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
					storePrefix: {
						dataType: 'uint32',
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
				required: ['storePrefix', 'storeKey', 'storeValue', 'bitmap'],
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

export const stateRecoveryInitParams = {
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

export const getChannelRequestSchema = getChainAccountRequestSchema;

export const getTerminatedStateAccountRequestSchema = getChainAccountRequestSchema;

export const getTerminatedOutboxAccountRequestSchema = getChainAccountRequestSchema;

export const genesisInteroperabilitySchema = {
	$id: '/interoperability/module/genesis',
	type: 'object',
	required: [
		'outboxRootSubstore',
		'chainDataSubstore',
		'channelDataSubstore',
		'chainValidatorsSubstore',
		'ownChainDataSubstore',
		'terminatedStateSubstore',
		'terminatedOutboxSubstore',
		'registeredNamesSubstore',
	],
	properties: {
		outboxRootSubstore: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...outboxRootSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		chainDataSubstore: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...chainAccountSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		channelDataSubstore: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...channelSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		chainValidatorsSubstore: {
			type: 'array',
			fieldNumber: 4,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						fieldNumber: 2,
						...chainValidatorsSchema,
					},
				},
			},
		},
		ownChainDataSubstore: {
			type: 'array',
			fieldNumber: 5,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...ownChainAccountSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		terminatedStateSubstore: {
			type: 'array',
			fieldNumber: 6,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...terminatedStateSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		terminatedOutboxSubstore: {
			type: 'array',
			fieldNumber: 7,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...terminatedOutboxSchema,
						fieldNumber: 2,
					},
				},
			},
		},
		registeredNamesSubstore: {
			type: 'array',
			fieldNumber: 8,
			items: {
				type: 'object',
				required: ['storeKey', 'storeValue'],
				properties: {
					storeKey: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					storeValue: {
						...chainIDSchema,
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

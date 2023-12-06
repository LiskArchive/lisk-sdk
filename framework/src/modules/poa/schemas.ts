/*
 * Copyright © 2023 Lisk Foundation
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
	LENGTH_BLS_KEY,
	LENGTH_GENERATOR_KEY,
	LENGTH_PROOF_OF_POSSESSION,
	MAX_LENGTH_NAME,
	NUM_BYTES_ADDRESS,
	MAX_NUM_VALIDATORS,
} from './constants';

export const configSchema = {
	$id: '/poa/config',
	type: 'object',
	properties: {
		authorityRegistrationFee: {
			type: 'string',
			format: 'uint64',
		},
	},
};

const validator = {
	type: 'object',
	required: ['address', 'weight'],
	properties: {
		address: {
			dataType: 'bytes',
			minLength: NUM_BYTES_ADDRESS,
			maxLength: NUM_BYTES_ADDRESS,
			fieldNumber: 1,
		},
		weight: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
	},
};

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0047.md#register-authority-command
export const registerAuthoritySchema = {
	$id: '/poa/command/registerAuthority',
	type: 'object',
	required: ['name', 'blsKey', 'proofOfPossession', 'generatorKey'],
	properties: {
		name: {
			dataType: 'string',
			minLength: 1,
			maxLength: MAX_LENGTH_NAME,
			fieldNumber: 1,
		},
		blsKey: {
			dataType: 'bytes',
			minLength: LENGTH_BLS_KEY,
			maxLength: LENGTH_BLS_KEY,
			fieldNumber: 2,
		},
		proofOfPossession: {
			dataType: 'bytes',
			minLength: LENGTH_PROOF_OF_POSSESSION,
			maxLength: LENGTH_PROOF_OF_POSSESSION,
			fieldNumber: 3,
		},
		generatorKey: {
			dataType: 'bytes',
			minLength: LENGTH_GENERATOR_KEY,
			maxLength: LENGTH_GENERATOR_KEY,
			fieldNumber: 4,
		},
	},
};

export const updateGeneratorKeySchema = {
	$id: '/poa/command/updateGeneratorKey',
	type: 'object',
	required: ['generatorKey'],
	properties: {
		generatorKey: {
			dataType: 'bytes',
			minLength: LENGTH_GENERATOR_KEY,
			maxLength: LENGTH_GENERATOR_KEY,
			fieldNumber: 1,
		},
	},
};

export const updateAuthoritySchema = {
	$id: '/poa/command/updateAuthority',
	type: 'object',
	required: ['newValidators', 'threshold', 'validatorsUpdateNonce', 'signature', 'aggregationBits'],
	properties: {
		newValidators: {
			type: 'array',
			fieldNumber: 1,
			items: validator,
			minItems: 1,
			maxItems: MAX_NUM_VALIDATORS,
		},
		threshold: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		validatorsUpdateNonce: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		signature: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
		aggregationBits: {
			dataType: 'bytes',
			fieldNumber: 5,
		},
	},
};

export const validatorSignatureMessageSchema = {
	$id: '/poa/command/validatorSignatureMessage',
	type: 'object',
	required: ['newValidators', 'threshold', 'validatorsUpdateNonce'],
	properties: {
		newValidators: {
			type: 'array',
			fieldNumber: 1,
			items: validator,
		},
		threshold: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		validatorsUpdateNonce: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0047.md#genesis-poa-store-schema
export const genesisPoAStoreSchema = {
	$id: '/poa/genesis/genesisPoAStoreSchema',
	type: 'object',
	required: ['validators', 'snapshotSubstore'],
	properties: {
		validators: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'name', 'blsKey', 'proofOfPossession', 'generatorKey'],
				properties: {
					address: {
						dataType: 'bytes',
						minLength: NUM_BYTES_ADDRESS,
						maxLength: NUM_BYTES_ADDRESS,
						fieldNumber: 1,
					},
					name: {
						dataType: 'string',
						minLength: 1,
						maxLength: MAX_LENGTH_NAME,
						fieldNumber: 2,
					},
					blsKey: {
						dataType: 'bytes',
						minLength: LENGTH_BLS_KEY,
						maxLength: LENGTH_BLS_KEY,
						fieldNumber: 3,
					},
					proofOfPossession: {
						dataType: 'bytes',
						minLength: LENGTH_PROOF_OF_POSSESSION,
						maxLength: LENGTH_PROOF_OF_POSSESSION,
						fieldNumber: 4,
					},
					generatorKey: {
						dataType: 'bytes',
						minLength: LENGTH_GENERATOR_KEY,
						maxLength: LENGTH_GENERATOR_KEY,
						fieldNumber: 5,
					},
				},
			},
		},
		snapshotSubstore: {
			type: 'object',
			fieldNumber: 2,
			properties: {
				activeValidators: {
					type: 'array',
					fieldNumber: 1,
					items: {
						type: 'object',
						required: ['address', 'weight'],
						properties: {
							address: {
								dataType: 'bytes',
								minLength: NUM_BYTES_ADDRESS,
								maxLength: NUM_BYTES_ADDRESS,
								fieldNumber: 1,
							},
							weight: {
								dataType: 'uint64',
								fieldNumber: 2,
							},
						},
					},
					minItems: 1,
					maxItems: MAX_NUM_VALIDATORS,
				},
				threshold: {
					dataType: 'uint64',
					fieldNumber: 2,
				},
			},
			required: ['activeValidators', 'threshold'],
		},
	},
};

const validatorJSONSchema = {
	type: 'object',
	required: ['address', 'name', 'weight'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
		name: {
			type: 'string',
		},
		weight: {
			type: 'string',
			format: 'uint64',
		},
	},
};

export const getValidatorRequestSchema = {
	$id: 'modules/poa/endpoint/getValidatorRequest',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			dataType: 'string',
			format: 'lisk32',
		},
	},
};

export const getValidatorResponseSchema = {
	$id: 'modules/poa/endpoint/getValidatorResponse',
	...validatorJSONSchema,
};

export const getAllValidatorsResponseSchema = {
	$id: 'modules/poa/endpoint/getAllValidatorsResponse',
	type: 'object',
	required: ['validators'],
	properties: {
		validators: {
			type: 'array',
			items: validatorJSONSchema,
		},
	},
};

export const getRegistrationFeeResponseSchema = {
	$id: 'modules/poa/endpoint/getRegistrationFeeResponse',
	type: 'object',
	required: ['fee'],
	properties: {
		fee: {
			type: 'string',
		},
	},
};

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
	$id: '/validators/config',
	type: 'object',
	properties: {
		blockTime: {
			type: 'integer',
			format: 'uint32',
			minimum: 1,
		},
	},
	required: ['blockTime'],
};

export interface ValidateBLSKeyRequest {
	proofOfPossession: string;
	blsKey: string;
}

export const validateBLSKeyRequestSchema = {
	$id: '/validators/endpoint/validateBLSKeyRequest',
	title: 'Bls Key Properties',
	type: 'object',
	properties: {
		proofOfPossession: {
			type: 'string',
			format: 'hex',
		},
		blsKey: {
			type: 'string',
			format: 'hex',
		},
	},
	required: ['proofOfPossession', 'blsKey'],
};

export const validateBLSKeyResponseSchema = {
	$id: '/validators/endpoint/validateBLSKeyResponse',
	title: 'Bls Key Properties',
	type: 'object',
	properties: {
		valid: {
			type: 'boolean',
		},
	},
	required: ['valid'],
};

export interface GetValidatorRequest {
	address: string;
}

export const getValidatorRequestSchema = {
	$id: '/validators/endpoint/getValidatorRequest',
	title: 'Validator properties',
	type: 'object',
	properties: {
		address: {
			dataType: 'string',
			format: 'lisk32',
		},
	},
	required: ['address'],
};

export const getValidatorResponseSchema = {
	$id: '/validators/endpoint/getValidatorResponse',
	title: 'Validator properties',
	type: 'object',
	properties: {
		generatorKey: {
			type: 'string',
			format: 'hex',
		},
		blsKey: {
			type: 'string',
			format: 'hex',
		},
	},
	required: ['generatorKey', 'blsKey'],
};

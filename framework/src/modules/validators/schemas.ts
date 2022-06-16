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

export const validatorAccountSchema = {
	$id: '/validators/validatorAccountSubStore',
	title: 'Validators Account Keys',
	type: 'object',
	properties: {
		generatorKey: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		blsKey: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
	},
	required: ['generatorKey', 'blsKey'],
};

export const validatorAddressSchema = {
	$id: '/validators/registeredBlsKeysSubStore',
	title: 'Validators Addresses',
	type: 'object',
	properties: {
		address: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
	},
	required: ['address'],
};

export const genesisDataSchema = {
	$id: '/validators/genesisDataSubStore',
	title: 'Timestamp',
	type: 'object',
	properties: {
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
	required: ['timestamp'],
};

export interface ValidateBLSKeyRequest {
	proofOfPossession: string;
	blsKey: string;
}

export const validateBLSKeyRequestSchema = {
	$id: '/validators/validateBLSKey',
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

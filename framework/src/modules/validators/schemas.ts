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

export const generatorListSchema = {
	$id: '/validators/generatorListSubStore',
	title: 'Generator Addresses',
	type: 'object',
	properties: {
		addresses: {
			type: 'array',
			fieldNumber: 1,
			items: {
				dataType: 'bytes',
			},
		},
	},
	required: ['addresses'],
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
			dataType: 'uint64',
			fieldNumber: 1,
		},
	},
	required: ['timestamp'],
};

export interface validateBLSKeyRequest {
	proofOfPossession: Buffer;
	blsKey: Buffer;
}

export const validateBLSKeyRequestSchema = {
	$id: '/validators/validateBLSKey',
	title: 'Bls Key Properties',
	type: 'object',
	properties: {
		proofOfPossession: {
			dataType: 'bytes',
		},
		blsKey: {
			dataType: 'bytes',
		},
	},
	required: ['proofOfPossession', 'blsKey'],
};

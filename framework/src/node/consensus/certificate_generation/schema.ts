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

export const certificateSchema = {
	$id: 'consensus/certificate',
	type: 'object',
	required: ['blockID', 'height', 'timestamp', 'stateRoot', 'validatorsHash'],
	properties: {
		blockID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		height: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		timestamp: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		stateRoot: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
		validatorsHash: {
			dataType: 'bytes',
			fieldNumber: 5,
		},
		aggregationBits: {
			dataType: 'bytes',
			fieldNumber: 6,
		},
		signature: {
			dataType: 'bytes',
			fieldNumber: 7,
		},
	},
};

export const singleCommitSchema = {
	$id: 'consensus/singleCommit',
	type: 'object',
	required: ['blockID', 'height', 'validatorAddress', 'certificateSignature'],
	properties: {
		blockID: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		height: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		validatorAddress: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
		certificateSignature: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
	},
};

export const aggregateCommitSchema = {
	$id: 'consensus/aggregateCommit',
	type: 'object',
	required: ['height', 'aggregationBits', 'certificateSignature'],
	properties: {
		height: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		aggregationBits: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		certificateSignature: {
			dataType: 'bytes',
			fieldNumber: 3,
		},
	},
};

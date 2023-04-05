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

import {
	HASH_LENGTH,
	BLS_SIGNATURE_LENGTH,
	MAX_LENGTH_AGGREGATION_BITS,
} from '../../../modules/interoperability/constants';
import { ADDRESS_LENGTH } from '../../../modules/validators/constants';

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#schema
 */
export const unsignedCertificateSchema = {
	$id: '/consensus/unsignedCertificate',
	type: 'object',
	required: ['blockID', 'height', 'timestamp', 'stateRoot', 'validatorsHash'],
	properties: {
		blockID: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
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
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
			fieldNumber: 4,
		},
		validatorsHash: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
			fieldNumber: 5,
		},
	},
};

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#schema
 */
export const certificateSchema = {
	$id: '/consensus/certificate',
	type: 'object',
	required: [...unsignedCertificateSchema.required, 'aggregationBits', 'signature'],
	properties: {
		...unsignedCertificateSchema.properties,
		aggregationBits: {
			dataType: 'bytes',
			fieldNumber: 6,
			maxLength: MAX_LENGTH_AGGREGATION_BITS,
		},
		signature: {
			dataType: 'bytes',
			minLength: BLS_SIGNATURE_LENGTH,
			maxLength: BLS_SIGNATURE_LENGTH,
			fieldNumber: 7,
		},
	},
};

export const singleCommitSchema = {
	$id: '/consensus/singleCommit',
	type: 'object',
	required: ['blockID', 'height', 'validatorAddress', 'certificateSignature'],
	properties: {
		blockID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
		},
		height: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		validatorAddress: {
			dataType: 'bytes',
			minLength: ADDRESS_LENGTH,
			maxLength: ADDRESS_LENGTH,
			fieldNumber: 3,
			format: 'lisk32',
		},
		certificateSignature: {
			dataType: 'bytes',
			fieldNumber: 4,
			minLength: BLS_SIGNATURE_LENGTH,
			maxLength: BLS_SIGNATURE_LENGTH,
		},
	},
};

export interface SingleCommitsNetworkPacket {
	commits: Buffer[];
}

export const singleCommitsNetworkPacketSchema = {
	$id: '/consensus/singleCommitsNetworkPacket',
	type: 'object',
	required: ['commits'],
	properties: {
		commits: {
			type: 'array',
			fieldNumber: 1,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

export const aggregateCommitSchema = {
	$id: '/consensus/aggregateCommit',
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
			minLength: BLS_SIGNATURE_LENGTH,
			maxLength: BLS_SIGNATURE_LENGTH,
			fieldNumber: 3,
		},
	},
};

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

export const authAccountSchema = {
	type: 'object',
	properties: {
		nonce: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		numberOfSignatures: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 3,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 4,
		},
	},
	required: ['nonce', 'numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
};

export const registerMultisignatureCommandSchema = {
	$id: '/auth/command/regMultisig',
	type: 'object',
	properties: {
		numberOfSignatures: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 3,
		},
	},
	required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
};

export const configSchema = {
	$id: '/auth/config',
	type: 'object',
	properties: {},
};

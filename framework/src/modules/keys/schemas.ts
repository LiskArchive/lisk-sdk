/*
 * Copyright © 2020 Lisk Foundation
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

export const KeysSchema = {
	$id: 'lisk/keys/register',
	type: 'object',
	required: ['numberOfSignatures', 'optionalKeys', 'mandatoryKeys'],
	properties: {
		numberOfSignatures: {
			dataType: 'uint32',
			fieldNumber: 1,
			minimum: 1,
			maximum: 64,
		},
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
			minItems: 0,
			maxItems: 64,
			minLength: 32,
			maxLength: 32,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 3,
			minItems: 0,
			maxItems: 64,
			minLength: 32,
			maxLength: 32,
		},
	},
};

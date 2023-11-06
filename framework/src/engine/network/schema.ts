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

export const customNodeInfoSchema = {
	$id: '/nodeInfo/custom',
	type: 'object',
	required: ['height', 'blockVersion', 'lastBlockID', 'maxHeightPrevoted', 'legacy'],
	properties: {
		height: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		maxHeightPrevoted: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		blockVersion: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		lastBlockID: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
		legacy: {
			type: 'array',
			fieldNumber: 5,
			items: {
				dataType: 'bytes',
			},
		},
	},
};

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

import { LENGTH_COLLECTION_ID, MAX_LENGTH_MODULE_NAME, MIN_LENGTH_MODULE_NAME } from './constants';

export interface NFTAttributes {
	module: string;
	attributes: Buffer;
}

export const mintNftParamsSchema = {
	$id: '/lisk/nftTransferParams',
	type: 'object',
	required: ['nftID', 'recipientAddress', 'data'],
	properties: {
		address: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		collectionID: {
			dataType: 'bytes',
			minLength: LENGTH_COLLECTION_ID,
			maxLength: LENGTH_COLLECTION_ID,
			fieldNumber: 2,
		},
		attributesArray: {
			type: 'array',
			fieldNumber: 4,
			items: {
				type: 'object',
				required: ['module', 'attributes'],
				properties: {
					module: {
						dataType: 'string',
						minLength: MIN_LENGTH_MODULE_NAME,
						maxLength: MAX_LENGTH_MODULE_NAME,
						pattern: '^[a-zA-Z0-9]*$',
						fieldNumber: 1,
					},
					attributes: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
	},
};

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

import { MAX_DATA_LENGTH } from '../token/constants';
import { LENGTH_NFT_ID } from './constants';

export const transferParamsSchema = {
	$id: '/lisk/nftTransferParams',
	type: 'object',
	required: ['nftID', 'recipientAddress', 'data'],
	properties: {
		nftID: {
			dataType: 'bytes',
			minLength: LENGTH_NFT_ID,
			maxLength: LENGTH_NFT_ID,
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 2,
		},
		data: {
			dataType: 'string',
			minLength: 0,
			maxLength: MAX_DATA_LENGTH,
			fieldNumber: 3,
		},
	},
};

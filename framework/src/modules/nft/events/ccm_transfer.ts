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

import { BaseEvent, EventQueuer } from '../../base_event';
import { LENGTH_NFT_ID, NftEventResult } from '../constants';

export interface CCMTransferEventData {
	senderAddress: Buffer;
	recipientAddress: Buffer;
	nftID: Buffer;
}

export const ccmTransferEventDataSchema = {
	$id: '/nft/events/ccmTransfer',
	type: 'object',
	required: ['senderAddress', 'recipientAddress', 'nftID', 'result'],
	properties: {
		senderAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 2,
		},
		nftID: {
			dataType: 'bytes',
			minLength: LENGTH_NFT_ID,
			maxLength: LENGTH_NFT_ID,
			fieldNumber: 3,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};

export class CcmTransferEvent extends BaseEvent<CCMTransferEventData & { result: NftEventResult }> {
	public schema = ccmTransferEventDataSchema;

	public log(ctx: EventQueuer, data: CCMTransferEventData): void {
		this.add(ctx, { ...data, result: NftEventResult.SUCCESSFUL }, [
			data.senderAddress,
			data.recipientAddress,
		]);
	}
}

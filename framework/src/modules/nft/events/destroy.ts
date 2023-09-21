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
import { LENGTH_NFT_ID, NftErrorEventResult, NftEventResult } from '../constants';

export interface DestroyEventData {
	address: Buffer;
	nftID: Buffer;
}

export const destroyEventSchema = {
	$id: '/nft/events/destroy',
	type: 'object',
	required: ['address', 'nftID', 'result'],
	properties: {
		address: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		nftID: {
			dataType: 'bytes',
			minLength: LENGTH_NFT_ID,
			maxLength: LENGTH_NFT_ID,
			fieldNumber: 2,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export class DestroyEvent extends BaseEvent<DestroyEventData & { result: NftEventResult }> {
	public schema = destroyEventSchema;

	public log(ctx: EventQueuer, data: DestroyEventData): void {
		this.add(ctx, { ...data, result: NftEventResult.RESULT_SUCCESSFUL }, [
			data.address,
			data.nftID,
		]);
	}

	public error(ctx: EventQueuer, data: DestroyEventData, result: NftErrorEventResult): void {
		this.add(ctx, { ...data, result }, [data.address, data.nftID], true);
	}
}

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

export interface SetAttributesEventData {
	nftID: Buffer;
	attributes: Buffer;
}

export const setAttributesEventSchema = {
	$id: '/nft/events/setAttributes',
	type: 'object',
	required: ['nftID', 'attributes', 'result'],
	properties: {
		nftID: {
			dataType: 'bytes',
			minLength: LENGTH_NFT_ID,
			maxLength: LENGTH_NFT_ID,
			fieldNumber: 1,
		},
		attributes: {
			dataType: 'bytes',
			fieldNumber: 2,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export class SetAttributesEvent extends BaseEvent<
	SetAttributesEventData & { result: NftEventResult }
> {
	public schema = setAttributesEventSchema;

	public log(ctx: EventQueuer, data: SetAttributesEventData): void {
		this.add(ctx, { ...data, result: NftEventResult.SUCCESSFUL }, [data.nftID]);
	}
}

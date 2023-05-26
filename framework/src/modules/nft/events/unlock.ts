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
import {
	LENGTH_NFT_ID,
	MAX_LENGTH_MODULE_NAME,
	MIN_LENGTH_MODULE_NAME,
	NftEventResult,
} from '../constants';

export interface UnlockEventData {
	module: string;
	nftID: Buffer;
}

export const unlockEventSchema = {
	$id: '/nft/events/unlock',
	type: 'object',
	required: ['module', 'nftID', 'result'],
	properties: {
		module: {
			dataType: 'string',
			minLength: MIN_LENGTH_MODULE_NAME,
			maxLength: MAX_LENGTH_MODULE_NAME,
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

export class UnlockEvent extends BaseEvent<UnlockEventData & { result: NftEventResult }> {
	public schema = unlockEventSchema;

	public log(ctx: EventQueuer, data: UnlockEventData): void {
		this.add(ctx, { ...data, result: NftEventResult.RESULT_SUCCESSFUL }, [
			Buffer.from(data.module),
			data.nftID,
		]);
	}
}

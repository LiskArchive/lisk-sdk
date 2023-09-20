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
	NftErrorEventResult,
	NftEventResult,
} from '../constants';

export interface LockEventData {
	module: string;
	nftID: Buffer;
}

export const lockEventSchema = {
	$id: '/nft/events/lock',
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

export class LockEvent extends BaseEvent<LockEventData & { result: NftEventResult }> {
	public schema = lockEventSchema;

	public log(ctx: EventQueuer, data: LockEventData): void {
		this.add(ctx, { ...data, result: NftEventResult.RESULT_SUCCESSFUL }, [
			Buffer.from(data.module),
			data.nftID,
		]);
	}

	public error(ctx: EventQueuer, data: LockEventData, result: NftErrorEventResult) {
		this.add(ctx, { ...data, result }, [Buffer.from(data.module), data.nftID], true);
	}
}

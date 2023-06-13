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
import { LENGTH_NFT_ID, LENGTH_CHAIN_ID, NftEventResult, NftErrorEventResult } from '../constants';

export interface RecoverEventData {
	terminatedChainID: Buffer;
	nftID: Buffer;
}

export const recoverEventSchema = {
	$id: '/nft/events/recover',
	type: 'object',
	required: ['terminatedChainID', 'nftID', 'result'],
	properties: {
		terminatedChainID: {
			dataType: 'bytes',
			minLength: LENGTH_CHAIN_ID,
			maxLength: LENGTH_CHAIN_ID,
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

export class RecoverEvent extends BaseEvent<RecoverEventData & { result: NftEventResult }> {
	public schema = recoverEventSchema;

	public log(ctx: EventQueuer, data: RecoverEventData): void {
		this.add(ctx, { ...data, result: NftEventResult.RESULT_SUCCESSFUL }, [data.nftID]);
	}

	public error(ctx: EventQueuer, data: RecoverEventData, result: NftErrorEventResult): void {
		this.add(ctx, { ...data, result }, [data.nftID], true);
	}
}

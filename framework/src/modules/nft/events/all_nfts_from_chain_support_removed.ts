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
import { LENGTH_CHAIN_ID } from '../constants';

export interface AllNFTsFromChainSupportRemovedEventData {
	chainID: Buffer;
}

export const allNFTsFromChainSupportRemovedEventSchema = {
	$id: '/nft/events/allNFTsFromChainSupportRemoved',
	type: 'object',
	required: ['chainID'],
	properties: {
		chainID: {
			dataType: 'bytes',
			minLength: LENGTH_CHAIN_ID,
			maxLength: LENGTH_CHAIN_ID,
			fieldNumber: 1,
		},
	},
};

export class AllNFTsFromChainSupportRemovedEvent extends BaseEvent<AllNFTsFromChainSupportRemovedEventData> {
	public schema = allNFTsFromChainSupportRemovedEventSchema;

	public log(ctx: EventQueuer, chainID: Buffer): void {
		this.add(ctx, { chainID }, [chainID]);
	}
}

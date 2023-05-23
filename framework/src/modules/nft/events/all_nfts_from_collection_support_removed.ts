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
import { LENGTH_CHAIN_ID, LENGTH_COLLECTION_ID } from '../constants';

export interface AllNFTsFromCollectionSupportRemovedEventData {
	chainID: Buffer;
	collectionID: Buffer;
}

export const removeSupportAllNFTsFromCollectionEventDataSchema = {
	$id: '/nft/events/removeSupportAllNFTsFromCollection',
	type: 'object',
	required: ['chainID', 'collectionID'],
	properties: {
		chainID: {
			dataType: 'bytes',
			minLength: LENGTH_CHAIN_ID,
			maxLength: LENGTH_CHAIN_ID,
			fieldNumber: 1,
		},
		collectionID: {
			dataType: 'bytes',
			minLength: LENGTH_COLLECTION_ID,
			maxLength: LENGTH_COLLECTION_ID,
			fieldNumber: 2,
		},
	},
};

export class AllNFTsFromCollectionSupportRemovedEvent extends BaseEvent<AllNFTsFromCollectionSupportRemovedEventData> {
	public schema = removeSupportAllNFTsFromCollectionEventDataSchema;

	public log(ctx: EventQueuer, data: AllNFTsFromCollectionSupportRemovedEventData): void {
		this.add(ctx, data, [data.chainID, data.collectionID]);
	}
}

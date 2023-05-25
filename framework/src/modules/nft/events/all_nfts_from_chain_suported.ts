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

export const allNFTsFromChainSupportedEventSchema = {
	$id: '/nft/events/allNFTsFromChainSupported',
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

export class AllNFTsFromChainSupportedEvent extends BaseEvent<Buffer> {
	public schema = allNFTsFromChainSupportedEventSchema;

	public log(ctx: EventQueuer, chainID: Buffer): void {
		this.add(ctx, chainID, [chainID]);
	}
}

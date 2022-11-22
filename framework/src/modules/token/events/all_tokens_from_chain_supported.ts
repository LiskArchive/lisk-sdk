/*
 * Copyright © 2022 Lisk Foundation
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
import { CHAIN_ID_LENGTH } from '../constants';

export interface AllTokensFromChainSupportedEventData {
	chainID: Buffer;
}

export const allTokensFromChainSupportedEventSchema = {
	$id: '/token/events/allTokensFromChainSupported',
	type: 'object',
	required: ['chainID'],
	properties: {
		chainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 1,
		},
	},
};

export class AllTokensFromChainSupportedEvent extends BaseEvent<AllTokensFromChainSupportedEventData> {
	public schema = allTokensFromChainSupportedEventSchema;

	public log(ctx: EventQueuer, chainID: Buffer): void {
		this.add(ctx, { chainID }, [chainID]);
	}
}

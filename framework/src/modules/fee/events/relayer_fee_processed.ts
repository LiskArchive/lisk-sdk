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
import { HASH_LENGTH } from '../constants';

export interface RelayerFeeProcessedData {
	ccmID: Buffer;
	relayerAddress: Buffer;
	burntAmount: bigint;
	relayerAmount: bigint;
}

export const relayerFeeProcessedSchema = {
	$id: '/fee/events/relayerFeeProcessed',
	type: 'object',
	required: ['ccmID', 'relayerAddress', 'burntAmount', 'relayerAmount'],
	properties: {
		ccmID: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
			fieldNumber: 1,
		},
		relayerAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 2,
		},
		burntAmount: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		relayerAmount: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
	},
};

export class RelayerFeeProcessedEvent extends BaseEvent<RelayerFeeProcessedData> {
	public schema = relayerFeeProcessedSchema;

	public log(ctx: EventQueuer, data: RelayerFeeProcessedData): void {
		this.add(ctx, data, [data.relayerAddress]);
	}
}

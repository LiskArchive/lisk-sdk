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

export interface RewardMintedEventData {
	amount: bigint;
	reduction: number;
}

export const rewardMintedDataSchema = {
	$id: '/reward/events/rewardMintedData',
	type: 'object',
	required: ['amount', 'reduction'],
	properties: {
		amount: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		reduction: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export class RewardMintedEvent extends BaseEvent<RewardMintedEventData> {
	public schema = rewardMintedDataSchema;

	public log(ctx: EventQueuer, generatorAddress: Buffer, data: RewardMintedEventData): void {
		this.add(ctx, data, [generatorAddress]);
	}
}

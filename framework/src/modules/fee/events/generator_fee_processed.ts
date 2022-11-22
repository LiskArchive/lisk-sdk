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

export interface GeneratorFeeProcessedData {
	senderAddress: Buffer;
	generatorAddress: Buffer;
	burntAmount: bigint;
	generatorAmount: bigint;
}

export const generatorFeeProcessedSchema = {
	$id: '/fee/events/generatorFeeProcessed',
	type: 'object',
	required: ['senderAddress', 'generatorAddress', 'burntAmount', 'generatorAmount'],
	properties: {
		senderAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		generatorAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 2,
		},
		burntAmount: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		generatorAmount: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
	},
};

export class GeneratorFeeProcessedEvent extends BaseEvent<GeneratorFeeProcessedData> {
	public schema = generatorFeeProcessedSchema;

	public log(ctx: EventQueuer, data: GeneratorFeeProcessedData): void {
		this.add(ctx, data, [data.senderAddress, data.generatorAddress]);
	}
}

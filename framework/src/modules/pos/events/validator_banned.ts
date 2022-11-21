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

export interface ValidatorBannedEventData {
	address: Buffer;
	height: number;
}

export const validatorBannedDataSchema = {
	$id: '/pos/events/validatorBannedData',
	type: 'object',
	required: ['address', 'height'],
	properties: {
		address: {
			dataType: 'bytes',
			fieldNumber: 1,
			format: 'lisk32',
		},
		height: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
};

export class ValidatorBannedEvent extends BaseEvent<ValidatorBannedEventData> {
	public schema = validatorBannedDataSchema;

	public log(ctx: EventQueuer, data: ValidatorBannedEventData): void {
		this.add(ctx, data, [data.address]);
	}
}

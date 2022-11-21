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

export interface RegisterValidatorEventData {
	address: Buffer;
	name: string;
}

export const validatorRegisteredDataSchema = {
	$id: '/pos/events/registerValidatorData',
	type: 'object',
	required: ['address', 'name'],
	properties: {
		address: {
			dataType: 'bytes',
			fieldNumber: 1,
			format: 'lisk32',
		},
		name: {
			dataType: 'string',
			fieldNumber: 2,
		},
	},
};

export class ValidatorRegisteredEvent extends BaseEvent<RegisterValidatorEventData> {
	public schema = validatorRegisteredDataSchema;

	public log(ctx: EventQueuer, data: RegisterValidatorEventData): void {
		this.add(ctx, data, [data.address]);
	}
}

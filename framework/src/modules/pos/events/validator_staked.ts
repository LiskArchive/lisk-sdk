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
import { PoSEventResult } from '../constants';

export interface ValidatorStakedEventData {
	senderAddress: Buffer;
	validatorAddress: Buffer;
	amount: bigint;
}

export const validatorStakedDataSchema = {
	$id: '/pos/events/validatorStakedData',
	type: 'object',
	required: ['senderAddress', 'validatorAddress', 'amount', 'result'],
	properties: {
		senderAddress: {
			dataType: 'bytes',
			fieldNumber: 1,
			format: 'lisk32',
		},
		validatorAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
			format: 'lisk32',
		},
		amount: {
			dataType: 'sint64',
			fieldNumber: 3,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};

export class ValidatorStakedEvent extends BaseEvent<
	ValidatorStakedEventData & { result: PoSEventResult }
> {
	public schema = validatorStakedDataSchema;

	public log(ctx: EventQueuer, data: ValidatorStakedEventData): void {
		this.add(ctx, { ...data, result: PoSEventResult.STAKE_SUCCESSFUL }, [
			data.senderAddress,
			data.validatorAddress,
		]);
	}

	public error(ctx: EventQueuer, data: ValidatorStakedEventData, result: PoSEventResult): void {
		this.add(ctx, { ...data, result }, [data.senderAddress, data.validatorAddress], true);
	}
}

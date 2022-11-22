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

export interface CommissionChangeEventData {
	validatorAddress: Buffer;
	oldCommission: number;
	newCommission: number;
}

export const commissionChangeEventParams = {
	$id: '/pos/events/commissionChangeData',
	type: 'object',
	required: ['validatorAddress', 'oldCommission', 'newCommission'],
	properties: {
		validatorAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		oldCommission: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
		newCommission: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};

export class CommissionChangeEvent extends BaseEvent<CommissionChangeEventData> {
	public schema = commissionChangeEventParams;

	public log(ctx: EventQueuer, data: CommissionChangeEventData): void {
		this.add(ctx, { ...data }, [data.validatorAddress]);
	}
}

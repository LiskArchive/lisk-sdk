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
import { TOKEN_ID_LENGTH } from '../constants';

export interface RewardsAssignedEventData {
	stakerAddress: Buffer;
	validatorAddress: Buffer;
	tokenID: Buffer;
	amount: bigint;
}

export const rewardsAssignedEventParams = {
	$id: '/pos/events/rewardsAssignedData',
	type: 'object',
	required: ['stakerAddress', 'validatorAddress', 'tokenID', 'amount'],
	properties: {
		stakerAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		validatorAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 2,
		},
		tokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 3,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
	},
};

export class RewardsAssignedEvent extends BaseEvent<RewardsAssignedEventData> {
	public schema = rewardsAssignedEventParams;

	public log(ctx: EventQueuer, data: RewardsAssignedEventData): void {
		this.add(ctx, { ...data }, [data.stakerAddress]);
	}
}

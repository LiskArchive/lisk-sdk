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

export interface DelegateVotedEventData {
	senderAddress: Buffer;
	delegateAddress: Buffer;
	amount: bigint;
}

export const delegateVotedDataSchema = {
	$id: '/pos/events/delegateVotedData',
	type: 'object',
	required: ['senderAddress', 'delegateAddress', 'amount', 'result'],
	properties: {
		senderAddress: {
			dataType: 'bytes',
			fieldNumber: 1,
			format: 'lisk32',
		},
		delegateAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
			format: 'lisk32',
		},
		amount: {
			datatype: 'uint64',
			fieldNumber: 3,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};

export class DelegateVotedEvent extends BaseEvent<
	DelegateVotedEventData & { result: PoSEventResult }
> {
	public schema = delegateVotedDataSchema;

	public log(ctx: EventQueuer, data: DelegateVotedEventData): void {
		this.add(ctx, { ...data, result: PoSEventResult.SUCCESSFUL }, [
			data.senderAddress,
			data.delegateAddress,
		]);
	}

	public error(ctx: EventQueuer, data: DelegateVotedEventData, result: PoSEventResult): void {
		this.add(ctx, { ...data, result }, [data.senderAddress, data.delegateAddress], true);
	}
}

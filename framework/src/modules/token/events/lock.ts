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
import {
	TOKEN_ID_LENGTH,
	TokenEventResult,
	TokenErrorEventResult,
	MAX_MODULE_NAME_LENGTH,
	MIN_MODULE_NAME_LENGTH,
} from '../constants';

export interface LockEventData {
	address: Buffer;
	module: string;
	tokenID: Buffer;
	amount: bigint;
}

export const lockEventSchema = {
	$id: '/token/events/lock',
	type: 'object',
	required: ['address', 'module', 'tokenID', 'amount', 'result'],
	properties: {
		address: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 1,
		},
		module: {
			dataType: 'string',
			minLength: MIN_MODULE_NAME_LENGTH,
			maxLength: MAX_MODULE_NAME_LENGTH,
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
		result: {
			dataType: 'uint32',
			fieldNumber: 5,
		},
	},
};

export class LockEvent extends BaseEvent<LockEventData & { result: TokenEventResult }> {
	public schema = lockEventSchema;

	public log(ctx: EventQueuer, data: LockEventData): void {
		this.add(ctx, { ...data, result: TokenEventResult.SUCCESSFUL }, [data.address]);
	}

	public error(ctx: EventQueuer, data: LockEventData, result: TokenErrorEventResult): void {
		this.add(ctx, { ...data, result }, [data.address], true);
	}
}

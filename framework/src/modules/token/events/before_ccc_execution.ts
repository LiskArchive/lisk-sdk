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
	HASH_LENGTH,
} from '../constants';

export interface BeforeCCCExecutionEventData {
	ccmID: Buffer;
	messageFeeTokenID: Buffer;
	relayerAddress: Buffer;
}

export const beforeCCCExecutionEventSchema = {
	$id: '/token/events/beforeCCCExecution',
	type: 'object',
	required: ['ccmID', 'messageFeeTokenID', 'relayerAddress', 'result'],
	properties: {
		ccmID: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
			fieldNumber: 1,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 2,
		},
		relayerAddress: {
			dataType: 'bytes',
			format: 'lisk32',
			fieldNumber: 3,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};

export class BeforeCCCExecutionEvent extends BaseEvent<
	BeforeCCCExecutionEventData & { result: TokenEventResult }
> {
	public schema = beforeCCCExecutionEventSchema;

	public log(ctx: EventQueuer, data: BeforeCCCExecutionEventData): void {
		this.add(ctx, { ...data, result: TokenEventResult.SUCCESSFUL }, [
			data.relayerAddress,
			data.messageFeeTokenID,
		]);
	}

	public error(
		ctx: EventQueuer,
		data: BeforeCCCExecutionEventData,
		result: TokenErrorEventResult,
	): void {
		this.add(ctx, { ...data, result }, [data.relayerAddress, data.messageFeeTokenID], true);
	}
}

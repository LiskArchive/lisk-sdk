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
	CHAIN_ID_LENGTH,
} from '../constants';

export interface RecoverEventData {
	terminatedChainID: Buffer;
	tokenID: Buffer;
	amount: bigint;
	recipientAddress: Buffer;
}

export const recoverEventSchema = {
	$id: '/token/events/recover',
	type: 'object',
	required: ['terminatedChainID', 'tokenID', 'amount', 'result'],
	properties: {
		terminatedChainID: {
			dataType: 'bytes',
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
			fieldNumber: 1,
		},
		tokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 2,
		},
		amount: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		result: {
			dataType: 'uint32',
			fieldNumber: 4,
		},
	},
};

export class RecoverEvent extends BaseEvent<RecoverEventData & { result: TokenEventResult }> {
	public schema = recoverEventSchema;

	public log(ctx: EventQueuer, address: Buffer, data: RecoverEventData): void {
		this.add(ctx, { ...data, result: TokenEventResult.SUCCESSFUL }, [address]);
	}

	public error(
		ctx: EventQueuer,
		address: Buffer,
		data: RecoverEventData,
		result: TokenErrorEventResult,
	): void {
		this.add(ctx, { ...data, result }, [address], true);
	}
}
